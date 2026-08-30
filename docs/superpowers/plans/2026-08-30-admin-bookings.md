# Reservaciones + Lista de Espera en apps/admin Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ledger de créditos por cliente, reservar/cancelar una clase a nombre de un cliente desde admin, lista de espera con promoción manual, todo con verificación de cupo/crédito atómica a nivel de base de datos.

**Architecture:** Feature-First (`apps/admin/src/features/bookings/`, `features/credits/`), mismo patrón `Page → componente → hook → service → Supabase` ya usado en el resto del panel. Las escrituras que importan atomicidad (reservar, cancelar, promover, otorgar créditos) pasan por funciones RPC `security definer` en Postgres, no por INSERT/UPDATE directos desde el frontend.

**Tech Stack:** React + Vite + TypeScript strict, Tailwind CSS v4, Supabase (Postgres + RLS + funciones RPC + supabase-js tipado), Zod, React Router v6.

**Spec:** `docs/superpowers/specs/2026-08-30-admin-bookings-design.md`

## Global Constraints

- Toda escritura de `bookings` y `customer_credits_ledger` pasa por las funciones RPC (`book_class`, `cancel_booking`, `promote_from_waitlist`, `grant_credits`) — esas tablas NO tienen policy de `insert`/`update`/`delete` para `authenticated`, solo `select`. `waitlist` sí acepta INSERT/DELETE directos con RLS normal (staff-scoped) — no necesita la garantía transaccional de las otras dos.
- Los mensajes de error de las funciones RPC (`raise exception`) ya vienen en español, listos para mostrar tal cual al usuario — no se les aplica el patrón `mapSaveError` de RLS/constraint que usan los demás forms, solo `err instanceof Error ? err.message : "mensaje generico"`.
- Promoción de lista de espera es manual (botón), nunca automática, en este sub-proyecto.
- El proyecto no tiene test runner en `apps/admin` — verificación es `npm run typecheck` / `npm run lint` / `npm run build` por tarea, más verificación manual end-to-end en navegador real en la tarea final.
- Todo `<form>` usa `noValidate`. Modales cierran con tecla Escape (patrón ya establecido en Instructores/Clases/Paquetes/Alumnos).
- `"exactOptionalPropertyTypes": true` en `tsconfig.base.json` — cualquier payload con campos opcionales se tipa de forma estructural y se asigna condicionalmente, nunca `Record<string, ...> as any`.
- No se reserva ni cancela con `INSERT`/`UPDATE` directo desde el frontend — siempre `supabase.rpc(...)`.
- Sin más de 1 crédito por clase, sin ventana de tiempo de cancelación, sin expiración automática de créditos por vigencia — ver `docs/preguntas-para-negocio.md`.

---

### Task 1: Migración de reservaciones/créditos + regenerar tipos

**Files:**
- Create: `supabase/migrations/011_bookings.sql`
- Modify: `apps/admin/src/lib/database.types.ts` (regenerado completo)
- Modify: `apps/web/src/lib/database.types.ts` (regenerado completo, mismo patrón ya usado en migraciones anteriores)

**Interfaces:**
- Produces: tablas `public.customer_credits_ledger`, `public.bookings`, `public.waitlist`, y funciones `public.book_class`, `public.cancel_booking`, `public.promote_from_waitlist`, `public.grant_credits` — disponibles para las tareas siguientes vía el cliente Supabase tipado.

- [ ] **Step 1: Crear el archivo de migración**

```sql
-- supabase/migrations/011_bookings.sql
-- Reservaciones, lista de espera y ledger de creditos. Toda escritura de
-- bookings/ledger pasa por las funciones RPC de abajo (RLS solo permite
-- select en esas dos tablas) para garantizar la verificacion atomica de
-- cupo y credito -- ver docs/superpowers/specs/2026-08-30-admin-bookings-design.md.

create table public.customer_credits_ledger (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.business (id),
  customer_id uuid not null references public.profiles (id),
  delta integer not null,
  reason text not null check (reason in (
    'MANUAL_GRANT', 'PACKAGE_GRANT', 'BOOKING_CONSUMED', 'BOOKING_REFUNDED'
  )),
  granted_by uuid references public.profiles (id),
  notes text,
  created_at timestamptz not null default now()
);

create table public.bookings (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.business (id),
  class_id uuid not null references public.studio_classes (id),
  customer_id uuid not null references public.profiles (id),
  status text not null default 'CONFIRMED' check (status in ('CONFIRMED', 'CANCELLED')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index bookings_active_unique
  on public.bookings (class_id, customer_id)
  where status = 'CONFIRMED';

create table public.waitlist (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.business (id),
  class_id uuid not null references public.studio_classes (id),
  customer_id uuid not null references public.profiles (id),
  created_at timestamptz not null default now()
);
create unique index waitlist_unique on public.waitlist (class_id, customer_id);

alter table public.customer_credits_ledger enable row level security;
create policy "credits_ledger_select_staff"
  on public.customer_credits_ledger for select
  using (
    public.current_user_role() = 'SUPER_ADMIN'
    or (business_id = public.current_user_business_id()
        and public.current_user_role() in ('STAFF', 'BUSINESS_ADMIN'))
  );

alter table public.bookings enable row level security;
create policy "bookings_select_staff"
  on public.bookings for select
  using (
    public.current_user_role() = 'SUPER_ADMIN'
    or (business_id = public.current_user_business_id()
        and public.current_user_role() in ('STAFF', 'BUSINESS_ADMIN'))
  );

alter table public.waitlist enable row level security;
create policy "waitlist_manage_staff"
  on public.waitlist for all
  using (
    public.current_user_role() = 'SUPER_ADMIN'
    or (business_id = public.current_user_business_id()
        and public.current_user_role() in ('STAFF', 'BUSINESS_ADMIN'))
  )
  with check (
    public.current_user_role() = 'SUPER_ADMIN'
    or (business_id = public.current_user_business_id()
        and public.current_user_role() in ('STAFF', 'BUSINESS_ADMIN'))
  );

create or replace function public.book_class(p_customer_id uuid, p_class_id uuid)
returns public.bookings
language plpgsql security definer set search_path = public
as $$
declare
  v_business_id uuid;
  v_max_capacity integer;
  v_current_count integer;
  v_balance integer;
  v_booking public.bookings;
begin
  select business_id, max_capacity into v_business_id, v_max_capacity
  from public.studio_classes
  where id = p_class_id and status = 'SCHEDULED'
  for update;

  if not found then
    raise exception 'Clase no encontrada o no esta programada';
  end if;

  if exists (
    select 1 from public.bookings
    where class_id = p_class_id and customer_id = p_customer_id and status = 'CONFIRMED'
  ) then
    raise exception 'El cliente ya tiene una reservacion activa para esta clase';
  end if;

  select count(*) into v_current_count
  from public.bookings
  where class_id = p_class_id and status = 'CONFIRMED';

  if v_current_count >= v_max_capacity then
    raise exception 'La clase ya no tiene cupo disponible';
  end if;

  select coalesce(sum(delta), 0) into v_balance
  from public.customer_credits_ledger
  where customer_id = p_customer_id;

  if v_balance < 1 then
    raise exception 'El cliente no tiene creditos disponibles';
  end if;

  insert into public.bookings (business_id, class_id, customer_id, status)
  values (v_business_id, p_class_id, p_customer_id, 'CONFIRMED')
  returning * into v_booking;

  insert into public.customer_credits_ledger (business_id, customer_id, delta, reason, granted_by)
  values (v_business_id, p_customer_id, -1, 'BOOKING_CONSUMED', auth.uid());

  return v_booking;
end;
$$;

create or replace function public.cancel_booking(p_booking_id uuid)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_booking public.bookings;
begin
  select * into v_booking from public.bookings where id = p_booking_id for update;

  if not found then
    raise exception 'Reservacion no encontrada';
  end if;
  if v_booking.status = 'CANCELLED' then
    raise exception 'La reservacion ya estaba cancelada';
  end if;

  update public.bookings set status = 'CANCELLED', updated_at = now() where id = p_booking_id;

  insert into public.customer_credits_ledger (business_id, customer_id, delta, reason, granted_by)
  values (v_booking.business_id, v_booking.customer_id, 1, 'BOOKING_REFUNDED', auth.uid());
end;
$$;

create or replace function public.promote_from_waitlist(p_waitlist_id uuid)
returns public.bookings
language plpgsql security definer set search_path = public
as $$
declare
  v_entry public.waitlist;
  v_booking public.bookings;
begin
  select * into v_entry from public.waitlist where id = p_waitlist_id for update;

  if not found then
    raise exception 'Entrada de lista de espera no encontrada';
  end if;

  v_booking := public.book_class(v_entry.customer_id, v_entry.class_id);

  delete from public.waitlist where id = p_waitlist_id;

  return v_booking;
end;
$$;

create or replace function public.grant_credits(p_customer_id uuid, p_amount integer, p_notes text default null)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_business_id uuid;
begin
  if p_amount <= 0 then
    raise exception 'La cantidad de creditos debe ser mayor a 0';
  end if;

  select business_id into v_business_id from public.profiles where id = p_customer_id;
  if not found then
    raise exception 'Cliente no encontrado';
  end if;

  insert into public.customer_credits_ledger (business_id, customer_id, delta, reason, granted_by, notes)
  values (v_business_id, p_customer_id, p_amount, 'MANUAL_GRANT', auth.uid(), p_notes);
end;
$$;

grant execute on function public.book_class(uuid, uuid) to authenticated;
grant execute on function public.cancel_booking(uuid) to authenticated;
grant execute on function public.promote_from_waitlist(uuid) to authenticated;
grant execute on function public.grant_credits(uuid, integer, text) to authenticated;
```

- [ ] **Step 2: Aplicar la migración al proyecto de Supabase de desarrollo**

Usa la tool `mcp__claude_ai_Supabase__apply_migration` con `project_id: "eazyblybekyygimqpjjw"`, `name: "011_bookings"`, y `query` = el contenido exacto del archivo del Step 1. Si no está disponible, aplica el SQL manualmente desde el SQL Editor del dashboard de Supabase del proyecto `eazyblybekyygimqpjjw`.

Expected: sin errores. Confirma con `mcp__claude_ai_Supabase__list_tables` que `bookings`, `waitlist` y `customer_credits_ledger` existen, y que las 4 funciones existen (puedes verificarlo también con una query simple tipo `select proname from pg_proc where proname in ('book_class','cancel_booking','promote_from_waitlist','grant_credits');` vía el SQL Editor o la tool de ejecución de SQL si está disponible).

- [ ] **Step 3: Regenerar los tipos TypeScript en ambas apps**

Usa `mcp__claude_ai_Supabase__generate_typescript_types` con `project_id: "eazyblybekyygimqpjjw"`. Guarda el resultado completo (sobrescribiendo el archivo entero) en `apps/admin/src/lib/database.types.ts` y `apps/web/src/lib/database.types.ts`. Si la tool no está disponible, usa `supabase gen types typescript --project-id eazyblybekyygimqpjjw` y guarda la salida en ambos archivos.

- [ ] **Step 4: Verificar advisors de seguridad**

Corre `mcp__claude_ai_Supabase__get_advisors` con `project_id: "eazyblybekyygimqpjjw"` y `type: "security"`. Confirma que no aparece ninguna advertencia nueva sobre `bookings`, `waitlist`, `customer_credits_ledger` o las 4 funciones (ej. RLS deshabilitado, o una funcion `security definer` sin `search_path` fijo -- las 4 ya lo tienen). Si aparece algo, corrígelo en el mismo archivo de migración (todavía no está commiteada) y re-aplica.

- [ ] **Step 5: Verificar que ambas apps siguen compilando**

Run: `cd apps/admin && npm run typecheck && cd ../web && npm run typecheck`
Expected: sin errores en ninguna de las dos apps.

- [ ] **Step 6: Commit**

```bash
git add supabase/migrations/011_bookings.sql apps/admin/src/lib/database.types.ts apps/web/src/lib/database.types.ts
git commit -m "feat(db): tablas de reservaciones/lista de espera/creditos + funciones RPC transaccionales"
```

---

### Task 2: Reservaciones y lista de espera — tipos y service

**Files:**
- Create: `apps/admin/src/features/bookings/types/Booking.ts`
- Create: `apps/admin/src/features/bookings/types/WaitlistEntry.ts`
- Create: `apps/admin/src/features/bookings/services/bookingsService.ts`

**Interfaces:**
- Consumes: tablas `bookings`/`waitlist` y funciones RPC (Task 1).
- Produces: `type Booking = { id, businessId, classId, customerId, status: "CONFIRMED"|"CANCELLED", createdAt, updatedAt }`
- Produces: `type BookingWithCustomer = Booking & { customerName: string | null }`
- Produces: `type WaitlistEntry = { id, businessId, classId, customerId, createdAt }`
- Produces: `type WaitlistEntryWithCustomer = WaitlistEntry & { customerName: string | null }`
- Produces: `listBookingsByClass(classId: string): Promise<BookingWithCustomer[]>` (solo `CONFIRMED`)
- Produces: `listWaitlistByClass(classId: string): Promise<WaitlistEntryWithCustomer[]>` (orden FIFO)
- Produces: `bookClass(customerId: string, classId: string): Promise<Booking>`
- Produces: `cancelBooking(bookingId: string): Promise<void>`
- Produces: `addToWaitlist(businessId: string, classId: string, customerId: string): Promise<WaitlistEntry>`
- Produces: `removeFromWaitlist(id: string): Promise<void>`
- Produces: `promoteFromWaitlist(waitlistId: string): Promise<Booking>`

- [ ] **Step 1: Crear `types/Booking.ts`**

```typescript
// apps/admin/src/features/bookings/types/Booking.ts

/**
 * Forma en camelCase de una fila de `bookings` (ver
 * supabase/migrations/011_bookings.sql). El mapeo snake_case ->
 * camelCase vive en features/bookings/services/bookingsService.ts.
 */
export type Booking = {
  id: string;
  businessId: string;
  classId: string;
  customerId: string;
  status: "CONFIRMED" | "CANCELLED";
  createdAt: string;
  updatedAt: string;
};

/** Usado en la tabla de reservados de una clase, con el nombre del cliente. */
export type BookingWithCustomer = Booking & { customerName: string | null };
```

- [ ] **Step 2: Crear `types/WaitlistEntry.ts`**

```typescript
// apps/admin/src/features/bookings/types/WaitlistEntry.ts

/**
 * Forma en camelCase de una fila de `waitlist` (ver
 * supabase/migrations/011_bookings.sql).
 */
export type WaitlistEntry = {
  id: string;
  businessId: string;
  classId: string;
  customerId: string;
  createdAt: string;
};

/** Usado en la tabla de lista de espera, con el nombre del cliente. */
export type WaitlistEntryWithCustomer = WaitlistEntry & { customerName: string | null };
```

- [ ] **Step 3: Crear `services/bookingsService.ts`**

```typescript
// apps/admin/src/features/bookings/services/bookingsService.ts
import { supabase } from "@/lib/supabaseClient";
import type { Booking, BookingWithCustomer } from "../types/Booking";
import type { WaitlistEntry, WaitlistEntryWithCustomer } from "../types/WaitlistEntry";

const BOOKING_COLUMNS = "id, business_id, class_id, customer_id, status, created_at, updated_at";
const WAITLIST_COLUMNS = "id, business_id, class_id, customer_id, created_at";

type BookingRow = {
  id: string;
  business_id: string;
  class_id: string;
  customer_id: string;
  status: Booking["status"];
  created_at: string;
  updated_at: string;
};

type WaitlistRow = {
  id: string;
  business_id: string;
  class_id: string;
  customer_id: string;
  created_at: string;
};

function toBooking(row: BookingRow): Booking {
  return {
    id: row.id,
    businessId: row.business_id,
    classId: row.class_id,
    customerId: row.customer_id,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toWaitlistEntry(row: WaitlistRow): WaitlistEntry {
  return {
    id: row.id,
    businessId: row.business_id,
    classId: row.class_id,
    customerId: row.customer_id,
    createdAt: row.created_at,
  };
}

type BookingWithCustomerRow = BookingRow & { profiles: { full_name: string | null } | null };
type WaitlistWithCustomerRow = WaitlistRow & { profiles: { full_name: string | null } | null };

export async function listBookingsByClass(classId: string): Promise<BookingWithCustomer[]> {
  const { data, error } = await supabase
    .from("bookings")
    .select(`${BOOKING_COLUMNS}, profiles(full_name)`)
    .eq("class_id", classId)
    .eq("status", "CONFIRMED")
    .order("created_at", { ascending: true });

  if (error) throw error;
  return (data as BookingWithCustomerRow[]).map((row) => ({
    ...toBooking(row),
    customerName: row.profiles?.full_name ?? null,
  }));
}

export async function listWaitlistByClass(classId: string): Promise<WaitlistEntryWithCustomer[]> {
  const { data, error } = await supabase
    .from("waitlist")
    .select(`${WAITLIST_COLUMNS}, profiles(full_name)`)
    .eq("class_id", classId)
    .order("created_at", { ascending: true });

  if (error) throw error;
  return (data as WaitlistWithCustomerRow[]).map((row) => ({
    ...toWaitlistEntry(row),
    customerName: row.profiles?.full_name ?? null,
  }));
}

export async function bookClass(customerId: string, classId: string): Promise<Booking> {
  const { data, error } = await supabase.rpc("book_class", {
    p_customer_id: customerId,
    p_class_id: classId,
  });
  if (error) throw error;
  return toBooking(data as BookingRow);
}

export async function cancelBooking(bookingId: string): Promise<void> {
  const { error } = await supabase.rpc("cancel_booking", { p_booking_id: bookingId });
  if (error) throw error;
}

export async function addToWaitlist(
  businessId: string,
  classId: string,
  customerId: string,
): Promise<WaitlistEntry> {
  const { data, error } = await supabase
    .from("waitlist")
    .insert({ business_id: businessId, class_id: classId, customer_id: customerId })
    .select(WAITLIST_COLUMNS)
    .single();

  if (error) throw error;
  return toWaitlistEntry(data);
}

export async function removeFromWaitlist(id: string): Promise<void> {
  const { error } = await supabase.from("waitlist").delete().eq("id", id);
  if (error) throw error;
}

export async function promoteFromWaitlist(waitlistId: string): Promise<Booking> {
  const { data, error } = await supabase.rpc("promote_from_waitlist", {
    p_waitlist_id: waitlistId,
  });
  if (error) throw error;
  return toBooking(data as BookingRow);
}
```

- [ ] **Step 4: Typecheck**

Run: `cd apps/admin && npm run typecheck`
Expected: sin errores.

Dos puntos donde el compilador puede pedir un ajuste distinto al código de arriba (ya visto antes en este proyecto, mismo tipo de situación):
- La forma exacta de `profiles` en `BookingWithCustomerRow`/`WaitlistWithCustomerRow` (objeto único vs arreglo) depende de cómo `database.types.ts` haya inferido esa relación embebida — ajusta el tipo y el acceso (`row.profiles?.full_name` vs `row.profiles?.[0]?.full_name`) según lo que `tsc` exija.
- El tipo de retorno de `supabase.rpc("book_class", ...)`/`supabase.rpc("promote_from_waitlist", ...)` puede necesitar un cast distinto al `data as BookingRow` de arriba si los tipos generados para las funciones RPC no coinciden exactamente con `BookingRow` — ajusta el cast, nunca lo reemplaces por `any`.

Si necesitas ajustar cualquiera de los dos, documenta qué cambiaste y por qué en tu reporte.

- [ ] **Step 5: Commit**

```bash
git add apps/admin/src/features/bookings/types apps/admin/src/features/bookings/services
git commit -m "feat(admin): capa de datos de reservaciones y lista de espera"
```

---

### Task 3: Reservaciones y lista de espera — hook, componentes y página

**Files:**
- Create: `apps/admin/src/features/bookings/hooks/useClassBookings.ts`
- Create: `apps/admin/src/features/bookings/components/BookCustomerModal.tsx`
- Create: `apps/admin/src/pages/ClassBookingsPage.tsx`
- Modify: `apps/admin/src/features/classes/components/ClassesTable.tsx` (link "Ver reservaciones")
- Modify: `apps/admin/src/App.tsx` (ruta `/classes/:id`)

**Interfaces:**
- Consumes: todo lo de Task 2. `useClasses()` (`apps/admin/src/features/classes/hooks/useClasses.ts`, ya existente) para obtener título/`maxCapacity`/`businessId` de la clase por id — NO se crea un `getClass(id)` nuevo en `classesService.ts`, se reusa la lista ya cargada. `useCustomers()` (`apps/admin/src/features/customers/hooks/useCustomers.ts`, ya existente) para poblar el selector de clientes.
- Produces: hook `useClassBookings(classId: string, businessId: string)` → `{ bookings: BookingWithCustomer[]; waitlist: WaitlistEntryWithCustomer[]; loading: boolean; error: string | null; reload: () => Promise<void>; book: (customerId: string) => Promise<void>; cancel: (bookingId: string) => Promise<void>; addWaiting: (customerId: string) => Promise<void>; removeWaiting: (id: string) => Promise<void>; promote: (waitlistId: string) => Promise<void> }`.
- Produces: ruta `/classes/:id`, protegida con `RequireAuth` + `AdminLayout`.

- [ ] **Step 1: Crear `hooks/useClassBookings.ts`**

```typescript
// apps/admin/src/features/bookings/hooks/useClassBookings.ts
import { useCallback, useEffect, useState } from "react";
import {
  addToWaitlist,
  bookClass,
  cancelBooking,
  listBookingsByClass,
  listWaitlistByClass,
  promoteFromWaitlist,
  removeFromWaitlist,
} from "../services/bookingsService";
import type { BookingWithCustomer } from "../types/Booking";
import type { WaitlistEntryWithCustomer } from "../types/WaitlistEntry";

export function useClassBookings(classId: string, businessId: string) {
  const [bookings, setBookings] = useState<BookingWithCustomer[]>([]);
  const [waitlist, setWaitlist] = useState<WaitlistEntryWithCustomer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [bookingsData, waitlistData] = await Promise.all([
        listBookingsByClass(classId),
        listWaitlistByClass(classId),
      ]);
      setBookings(bookingsData);
      setWaitlist(waitlistData);
    } catch (err) {
      setError("No se pudieron cargar las reservaciones.");
      console.error("[bookings] reload fallo", err);
    } finally {
      setLoading(false);
    }
  }, [classId]);

  useEffect(() => {
    reload();
  }, [reload]);

  async function book(customerId: string) {
    await bookClass(customerId, classId);
    await reload();
  }

  async function cancel(bookingId: string) {
    await cancelBooking(bookingId);
    await reload();
  }

  async function addWaiting(customerId: string) {
    if (!businessId) throw new Error("Falta el business_id de la clase.");
    await addToWaitlist(businessId, classId, customerId);
    await reload();
  }

  async function removeWaiting(id: string) {
    await removeFromWaitlist(id);
    await reload();
  }

  async function promote(waitlistId: string) {
    await promoteFromWaitlist(waitlistId);
    await reload();
  }

  return { bookings, waitlist, loading, error, reload, book, cancel, addWaiting, removeWaiting, promote };
}
```

- [ ] **Step 2: Crear `components/BookCustomerModal.tsx`**

```tsx
// apps/admin/src/features/bookings/components/BookCustomerModal.tsx
import { useEffect, useState, type FormEvent } from "react";
import type { Customer } from "@/features/customers/types/Customer";

type Props = {
  open: boolean;
  title: string;
  submitLabel: string;
  customers: Customer[];
  onClose: () => void;
  onSubmit: (customerId: string) => Promise<void>;
};

export function BookCustomerModal({ open, title, submitLabel, customers, onClose, onSubmit }: Props) {
  const [customerId, setCustomerId] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setCustomerId("");
    setFormError(null);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    if (!customerId) {
      setFormError("Elige un cliente");
      return;
    }
    setIsSaving(true);
    try {
      await onSubmit(customerId);
      onClose();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "No se pudo completar la accion.");
      console.error("[bookings] modal submit fallo", err);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/40 p-4">
      <form
        id="book-customer-modal"
        onSubmit={handleSubmit}
        noValidate
        className="flex w-full max-w-sm flex-col gap-3 rounded-lg bg-white p-6"
      >
        <h2 className="text-lg font-semibold text-brand-primary">{title}</h2>

        <div className="flex flex-col gap-1">
          <select
            id="book-customer-select"
            value={customerId}
            onChange={(event) => setCustomerId(event.target.value)}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm"
          >
            <option value="">Elige un cliente</option>
            {customers.map((customer) => (
              <option key={customer.id} value={customer.id}>
                {customer.fullName ?? customer.id}
              </option>
            ))}
          </select>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-gray-600">
            Cancelar
          </button>
          <button
            type="submit"
            disabled={isSaving}
            className="rounded-md bg-brand-primary px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
          >
            {isSaving ? "Guardando..." : submitLabel}
          </button>
        </div>

        {formError && <p className="text-sm text-red-600">{formError}</p>}
      </form>
    </div>
  );
}
```

- [ ] **Step 3: Crear `pages/ClassBookingsPage.tsx`**

```tsx
// apps/admin/src/pages/ClassBookingsPage.tsx
import { useState } from "react";
import { useParams } from "react-router-dom";
import { BookCustomerModal } from "@/features/bookings/components/BookCustomerModal";
import { useClassBookings } from "@/features/bookings/hooks/useClassBookings";
import { useClasses } from "@/features/classes/hooks/useClasses";
import { useCustomers } from "@/features/customers/hooks/useCustomers";

export function ClassBookingsPage() {
  const { id } = useParams<{ id: string }>();
  const classId = id ?? "";
  const { classes } = useClasses();
  const studioClass = classes.find((c) => c.id === classId);
  const { customers } = useCustomers();
  const { bookings, waitlist, loading, error, book, cancel, addWaiting, removeWaiting, promote } =
    useClassBookings(classId, studioClass?.businessId ?? "");

  const [modalOpen, setModalOpen] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const isFull = studioClass ? bookings.length >= studioClass.maxCapacity : false;

  async function handleCancel(bookingId: string) {
    if (!window.confirm("Cancelar esta reservacion?")) return;
    setActionError(null);
    try {
      await cancel(bookingId);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "No se pudo cancelar.");
      console.error("[bookings] cancelar fallo", err);
    }
  }

  async function handlePromote(waitlistId: string) {
    setActionError(null);
    try {
      await promote(waitlistId);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "No se pudo promover.");
      console.error("[waitlist] promover fallo", err);
    }
  }

  async function handleRemoveWaiting(id: string) {
    setActionError(null);
    try {
      await removeWaiting(id);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "No se pudo quitar de la lista.");
      console.error("[waitlist] quitar fallo", err);
    }
  }

  async function handleModalSubmit(customerId: string) {
    if (isFull) {
      await addWaiting(customerId);
    } else {
      await book(customerId);
    }
  }

  if (!studioClass) {
    return <div className="mx-auto max-w-3xl p-6 text-sm text-gray-500">Cargando...</div>;
  }

  return (
    <div id="class-bookings-page" className="mx-auto max-w-3xl p-6">
      <h1 className="mb-1 text-xl font-semibold text-brand-primary">{studioClass.title}</h1>
      <p className="mb-4 text-sm text-gray-500">
        Cupo: {bookings.length}/{studioClass.maxCapacity}
      </p>

      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}
      {actionError && <p className="mb-4 text-sm text-red-600">{actionError}</p>}

      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-brand-primary">Reservados</h2>
        <button
          type="button"
          onClick={() => setModalOpen(true)}
          disabled={isFull}
          className="rounded-md bg-brand-primary px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
        >
          Reservar cliente
        </button>
      </div>

      {loading && <p className="text-sm text-gray-500">Cargando...</p>}
      {!loading && bookings.length === 0 && (
        <p className="mb-6 text-sm text-gray-500">Todavia no hay reservaciones.</p>
      )}
      {!loading && bookings.length > 0 && (
        <table id="bookings-table" className="mb-6 w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-gray-200 text-left text-gray-500">
              <th className="py-2">Cliente</th>
              <th className="py-2">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {bookings.map((booking) => (
              <tr key={booking.id} className="border-b border-gray-100">
                <td className="py-2">{booking.customerName ?? "-"}</td>
                <td className="py-2">
                  <button
                    type="button"
                    onClick={() => handleCancel(booking.id)}
                    className="text-gray-600 hover:underline"
                  >
                    Cancelar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-brand-primary">Lista de espera</h2>
        {isFull && (
          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className="rounded-md border border-brand-primary px-4 py-2 text-sm font-medium text-brand-primary hover:bg-brand-primary hover:text-white"
          >
            Agregar a lista de espera
          </button>
        )}
      </div>

      {waitlist.length === 0 && <p className="text-sm text-gray-500">Nadie en lista de espera.</p>}
      {waitlist.length > 0 && (
        <table id="waitlist-table" className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-gray-200 text-left text-gray-500">
              <th className="py-2">Cliente</th>
              <th className="py-2">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {waitlist.map((entry) => (
              <tr key={entry.id} className="border-b border-gray-100">
                <td className="py-2">{entry.customerName ?? "-"}</td>
                <td className="py-2">
                  <button
                    type="button"
                    onClick={() => handlePromote(entry.id)}
                    disabled={isFull}
                    className="mr-3 text-brand-primary hover:underline disabled:opacity-50"
                  >
                    Promover
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRemoveWaiting(entry.id)}
                    className="text-gray-600 hover:underline"
                  >
                    Quitar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <BookCustomerModal
        open={modalOpen}
        title={isFull ? "Agregar a lista de espera" : "Reservar cliente"}
        submitLabel={isFull ? "Agregar" : "Reservar"}
        customers={customers}
        onClose={() => setModalOpen(false)}
        onSubmit={handleModalSubmit}
      />
    </div>
  );
}
```

- [ ] **Step 4: Agregar el link "Ver reservaciones" en `ClassesTable.tsx`**

Lee el archivo actual (`apps/admin/src/features/classes/components/ClassesTable.tsx`) antes de editarlo — no lo reescribas completo, solo agrega el import de `Link` (de `react-router-dom`, si no está ya importado) y un `<Link to={\`/classes/${studioClass.id}\`}>Ver reservaciones</Link>` dentro de la celda de "Acciones" de cada fila, junto a los botones que ya existen ahí (Editar/Cancelar). Sigue el mismo estilo (`className="mr-3 text-brand-primary hover:underline"`, mismo patrón que el link "Ver" de `CustomersTable.tsx`) y colócalo antes de los botones existentes.

- [ ] **Step 5: Registrar la ruta en `App.tsx`**

```tsx
// apps/admin/src/App.tsx
// Agregar el import junto a los demas:
import { ClassBookingsPage } from "@/pages/ClassBookingsPage";

// Agregar dentro de <Routes>, junto a las rutas existentes:
          <Route
            path="/classes/:id"
            element={
              <RequireAuth>
                <AdminLayout>
                  <ClassBookingsPage />
                </AdminLayout>
              </RequireAuth>
            }
          />
```

- [ ] **Step 6: Typecheck, lint, build**

Run: `cd apps/admin && npm run typecheck && npm run lint && npm run build`
Expected: sin errores.

- [ ] **Step 7: Commit**

```bash
git add apps/admin/src/features/bookings apps/admin/src/pages/ClassBookingsPage.tsx apps/admin/src/features/classes/components/ClassesTable.tsx apps/admin/src/App.tsx
git commit -m "feat(admin): pagina de reservaciones y lista de espera por clase"
```

---

### Task 4: Créditos — datos y UI en el detalle de cliente

**Files:**
- Create: `apps/admin/src/features/credits/services/creditsService.ts`
- Create: `apps/admin/src/features/credits/hooks/useCustomerCredits.ts`
- Create: `apps/admin/src/features/credits/components/GrantCreditsModal.tsx`
- Modify: `apps/admin/src/pages/CustomerDetailPage.tsx`

**Interfaces:**
- Consumes: función RPC `grant_credits` y tabla `customer_credits_ledger` (Task 1).
- Produces: `getCreditBalance(customerId: string): Promise<number>`
- Produces: `grantCredits(customerId: string, amount: number, notes?: string | null): Promise<void>`
- Produces: hook `useCustomerCredits(customerId: string)` → `{ balance: number | null; loading: boolean; error: string | null; reload: () => Promise<void>; grant: (amount: number, notes?: string | null) => Promise<void> }`
- Produces: `<GrantCreditsModal open onClose onSubmit={(amount: number, notes?: string | null) => Promise<void>} />`

- [ ] **Step 1: Crear `services/creditsService.ts`**

```typescript
// apps/admin/src/features/credits/services/creditsService.ts
import { supabase } from "@/lib/supabaseClient";

export async function getCreditBalance(customerId: string): Promise<number> {
  const { data, error } = await supabase
    .from("customer_credits_ledger")
    .select("delta")
    .eq("customer_id", customerId);

  if (error) throw error;
  return data.reduce((sum, row) => sum + row.delta, 0);
}

export async function grantCredits(
  customerId: string,
  amount: number,
  notes?: string | null,
): Promise<void> {
  const { error } = await supabase.rpc("grant_credits", {
    p_customer_id: customerId,
    p_amount: amount,
    p_notes: notes ?? null,
  });
  if (error) throw error;
}
```

- [ ] **Step 2: Crear `hooks/useCustomerCredits.ts`**

```typescript
// apps/admin/src/features/credits/hooks/useCustomerCredits.ts
import { useCallback, useEffect, useState } from "react";
import { getCreditBalance, grantCredits } from "../services/creditsService";

export function useCustomerCredits(customerId: string) {
  const [balance, setBalance] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setBalance(await getCreditBalance(customerId));
    } catch (err) {
      setError("No se pudo cargar el balance de creditos.");
      console.error("[credits] getCreditBalance fallo", err);
    } finally {
      setLoading(false);
    }
  }, [customerId]);

  useEffect(() => {
    reload();
  }, [reload]);

  async function grant(amount: number, notes?: string | null) {
    await grantCredits(customerId, amount, notes);
    await reload();
  }

  return { balance, loading, error, reload, grant };
}
```

- [ ] **Step 3: Crear `components/GrantCreditsModal.tsx`**

```tsx
// apps/admin/src/features/credits/components/GrantCreditsModal.tsx
import { useEffect, useState, type FormEvent } from "react";
import { z } from "zod";

const schema = z.object({
  amount: z.coerce
    .number()
    .int("La cantidad debe ser un numero entero")
    .positive("La cantidad debe ser mayor a 0"),
  notes: z.string().optional(),
});

type Props = {
  open: boolean;
  onClose: () => void;
  onSubmit: (amount: number, notes?: string | null) => Promise<void>;
};

export function GrantCreditsModal({ open, onClose, onSubmit }: Props) {
  const [amount, setAmount] = useState("1");
  const [notes, setNotes] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setAmount("1");
    setNotes("");
    setFieldErrors({});
    setFormError(null);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);

    const result = schema.safeParse({ amount, notes });
    if (!result.success) {
      const errors: Record<string, string> = {};
      for (const issue of result.error.issues) {
        errors[String(issue.path[0])] = issue.message;
      }
      setFieldErrors(errors);
      return;
    }
    setFieldErrors({});

    setIsSaving(true);
    try {
      await onSubmit(result.data.amount, result.data.notes || null);
      onClose();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "No se pudo otorgar creditos.");
      console.error("[credits] grant fallo", err);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/40 p-4">
      <form
        id="grant-credits-modal"
        onSubmit={handleSubmit}
        noValidate
        className="flex w-full max-w-sm flex-col gap-3 rounded-lg bg-white p-6"
      >
        <h2 className="text-lg font-semibold text-brand-primary">Otorgar creditos</h2>

        <div className="flex flex-col gap-1">
          <label htmlFor="grant-credits-amount-input" className="text-xs text-gray-500">
            Cantidad
          </label>
          <input
            id="grant-credits-amount-input"
            type="number"
            min={1}
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
          {fieldErrors.amount && <p className="text-xs text-red-600">{fieldErrors.amount}</p>}
        </div>

        <div className="flex flex-col gap-1">
          <textarea
            id="grant-credits-notes-input"
            placeholder="Nota (opcional)"
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-gray-600">
            Cancelar
          </button>
          <button
            type="submit"
            disabled={isSaving}
            className="rounded-md bg-brand-primary px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
          >
            {isSaving ? "Guardando..." : "Otorgar"}
          </button>
        </div>

        {formError && <p className="text-sm text-red-600">{formError}</p>}
      </form>
    </div>
  );
}
```

- [ ] **Step 4: Agregar la sección "Créditos" en `CustomerDetailPage.tsx`**

Lee el archivo actual (`apps/admin/src/pages/CustomerDetailPage.tsx`) antes de editarlo. Agrega:

1. Imports nuevos junto a los existentes:

```tsx
import { GrantCreditsModal } from "@/features/credits/components/GrantCreditsModal";
import { useCustomerCredits } from "@/features/credits/hooks/useCustomerCredits";
```

2. Dentro del componente, junto a los demás hooks/estado ya presentes:

```tsx
  const { balance, loading: creditsLoading, error: creditsError, grant } = useCustomerCredits(customerId);
  const [creditsModalOpen, setCreditsModalOpen] = useState(false);

  async function handleGrantCredits(amount: number, notes?: string | null) {
    await grant(amount, notes);
  }
```

3. Un bloque JSX nuevo, entre el `{editError && ...}` del formulario de edición del cliente y el `<h2>Alumnos</h2>` existente:

```tsx
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-brand-primary">Creditos</h2>
        <button
          type="button"
          onClick={() => setCreditsModalOpen(true)}
          className="rounded-md bg-brand-primary px-4 py-2 text-sm font-medium text-white hover:opacity-90"
        >
          Otorgar creditos
        </button>
      </div>
      {creditsLoading && <p className="mb-6 text-sm text-gray-500">Cargando...</p>}
      {creditsError && <p className="mb-6 text-sm text-red-600">{creditsError}</p>}
      {!creditsLoading && !creditsError && (
        <p className="mb-6 text-2xl font-semibold text-brand-primary">{balance}</p>
      )}

      <GrantCreditsModal
        open={creditsModalOpen}
        onClose={() => setCreditsModalOpen(false)}
        onSubmit={handleGrantCredits}
      />
```

4. Verifica que `useState` ya esté importado en el archivo (debería estarlo, la página ya usa varios `useState`) — no dupliques el import de `react`.

- [ ] **Step 5: Typecheck, lint, build**

Run: `cd apps/admin && npm run typecheck && npm run lint && npm run build`
Expected: sin errores.

- [ ] **Step 6: Commit**

```bash
git add apps/admin/src/features/credits apps/admin/src/pages/CustomerDetailPage.tsx
git commit -m "feat(admin): creditos por cliente (balance + otorgar manual)"
```

---

### Task 5: Verificación end-to-end y cierre

**Files:**
- Modify: `docs/CURRENT_STATE.md`

**Interfaces:**
- Consumes: todas las rutas y funciones de las Tasks 1-4.

- [ ] **Step 1: Verificación end-to-end completa en navegador (checklist del spec)**

Con `npm run dev:admin` corriendo y sesión iniciada como `SUPER_ADMIN`:

1. Ir a un cliente (`/customers/:id`) sin créditos, otorgar 3 créditos → balance muestra 3.
2. Ir a una clase con cupo (`/classes/:id` vía "Ver reservaciones" en `/classes`), reservar a ese cliente → aparece en "Reservados", balance del cliente baja a 2.
3. Intentar reservar al mismo cliente en la misma clase otra vez → error "ya tiene una reservacion activa", no se duplica.
4. Reservar clientes distintos hasta llenar el cupo de una clase (usa una clase con `maxCapacity` bajo, o crea una de prueba) → botón "Reservar cliente" se deshabilita, aparece botón "Agregar a lista de espera".
5. Agregar un cliente a lista de espera → aparece en la tabla de lista de espera.
6. Cancelar una reservación existente para liberar cupo → desaparece de "Reservados", balance de ese cliente sube 1, botón "Promover" en lista de espera se habilita.
7. Promover al cliente en espera → pasa a "Reservados", desaparece de la lista de espera, su balance baja 1 (falla limpio con "no tiene creditos disponibles" si ese cliente no tiene créditos, sin romper la fila — probar también este caso con un cliente sin créditos en espera).
8. Quitar a alguien de la lista de espera sin promoverlo → desaparece de la tabla.
9. Intentar reservar a un cliente con balance 0 → error "no tiene creditos disponibles".
10. Tecla Escape cierra tanto `BookCustomerModal` como `GrantCreditsModal`.

- [ ] **Step 2: Actualizar `docs/CURRENT_STATE.md`**

Agrega una sección "Reservaciones y lista de espera en `apps/admin`" (mismo formato que las secciones de Instructores/Clases/Paquetes/Clientes ya existentes en "Funcionalidades implementadas") describiendo: ledger de créditos con otorgamiento manual, reservar/cancelar clase desde admin, lista de espera con promoción manual, verificación de cupo/crédito vía funciones RPC transaccionales (nombra las 4: `book_class`, `cancel_booking`, `promote_from_waitlist`, `grant_credits`), y que la promoción de lista de espera es manual por ahora (automática en un futuro, ver spec). Agrega la migración `011_bookings.sql` a "Migraciones existentes". Actualiza "In Progress"/"Next Task": este sub-proyecto completo y verificado (typecheck/lint/build + checklist manual del Step 1), pendiente de PR y merge; siguiente sub-proyecto acordado: **Academia** (inscripciones, colegiaturas, asistencia).

- [ ] **Step 3: Commit**

```bash
git add docs/CURRENT_STATE.md
git commit -m "docs: reservaciones+lista de espera completo, siguiente sub-proyecto Academia"
```
