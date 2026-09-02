# Reservaciones + Lista de Espera + Créditos en `apps/web` Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permitir al cliente final reservar/cancelar sus propias clases, ver su balance de créditos y unirse/salir de listas de espera, usando las mismas funciones RPC y tablas que ya existen en admin.

**Architecture:** Feature-First (`apps/web/src/features/bookings/`, `features/credits/`), mismo patrón `Page → componente → hook → service → Supabase`. Las escrituras atómicas usan las 4 funciones RPC `security definer` ya existentes en Postgres. RLS customer-scoped para `waitlist` (INSERT/DELETE directo) y lectura propia en `bookings`/`credits_ledger`.

**Tech Stack:** React + Vite + TypeScript strict, Tailwind CSS v4, Supabase (Postgres + RLS + funciones RPC + supabase-js tipado), Zod, React Router v6.

**Spec:** `docs/superpowers/specs/2026-09-01-web-bookings-design.md`

## Global Constraints

- Las 4 funciones RPC (`book_class`, `cancel_booking`, `promote_from_waitlist`, `grant_credits`) **ya existen** en la BD (migración `011_bookings.sql` + fix de seguridad). Este plan solo consume esas RPCs desde el frontend del cliente.
- RLS: añadir policies `*_own_select` / `waitlist_own_manage` para que el cliente lea/escriba solo sus propios datos — **esto requiere una migración nueva** (ver Task 1).
- `waitlist` no usa RPC: INSERT/DELETE directo con RLS `waitlist_own_manage` (unique index evita duplicados).
- El cliente **nunca** llama a `grant_credits` ni `promote_from_waitlist` (solo staff/admin).
- Mensajes de error de las RPC (`raise exception`) ya vienen en español → mostrar `error.message` tal cual.
- `"exactOptionalPropertyTypes": true` — tipado estructural y condicional.
- Todo `<form>` usa `noValidate`. Modales cierran con Escape.
- Sin test runner — verificación `typecheck`/`lint`/`build` + checklist manual en navegador.

---

### Task 1: Migración RLS customer-scoped + regenerar tipos

**Files:**
- Create: `supabase/migrations/015_web_bookings_rls.sql`
- Modify: `apps/admin/src/lib/database.types.ts` (regenerado)
- Modify: `apps/web/src/lib/database.types.ts` (regenerado)

**Interfaces:**
- Produce: policies `bookings_own_select`, `credits_ledger_own_select`, `waitlist_own_manage`.

- [ ] **Step 1: Crear el archivo de migración**

```sql
-- supabase/migrations/015_web_bookings_rls.sql
-- RLS policies para que el cliente (rol CUSTOMER) pueda operar sobre sus propios datos
-- en bookings, customer_credits_ledger y waitlist. Las policies de staff/admin
-- (creadas en 011_bookings.sql) se mantienen intactas.

-- 1. bookings: el cliente lee SOLO sus reservaciones
create policy "bookings_own_select"
  on public.bookings for select
  using (customer_id = auth.uid());

-- 2. customer_credits_ledger: el cliente lee SOLO sus movimientos
create policy "credits_ledger_own_select"
  on public.customer_credits_ledger for select
  using (customer_id = auth.uid());

-- 3. waitlist: el cliente inserta/borra SOLO sus propias entradas
-- (el unique index waitlist_unique ya evita duplicados class_id+customer_id)
create policy "waitlist_own_manage"
  on public.waitlist for all
  using (customer_id = auth.uid())
  with check (customer_id = auth.uid());
```

- [ ] **Step 2: Aplicar la migración en Supabase dev**

Usa `mcp__claude_ai_Supabase__apply_migration` con `project_id: "eazyblybekyygimqpjjw"`, `name: "015_web_bookings_rls"`, y `query` = contenido exacto del Step 1. O aplica manualmente en SQL Editor.

Expected: sin errores. Verifica con `mcp__claude_ai_Supabase__list_policies` o en dashboard que las 3 policies nuevas aparecen.

- [ ] **Step 3: Regenerar tipos TypeScript**

Regenera `apps/admin/src/lib/database.types.ts` y `apps/web/src/lib/database.types.ts` con `mcp__claude_ai_Supabase__generate_typescript_types` o `supabase gen types typescript --project-id eazyblybekyygimqpjjw`.

- [ ] **Step 4: Verificar advisors de seguridad**

Corre `mcp__claude_ai_Supabase__get_advisors` con `project_id: "eazyblybekyygimqpjjw"` y `type: "security"`. Confirma que no hay advertencias nuevas.

- [ ] **Step 5: Typecheck ambas apps**

Run: `cd apps/admin && npm run typecheck && cd ../web && npm run typecheck`
Expected: sin errores.

- [ ] **Step 6: Commit**

```bash
git add supabase/migrations/015_web_bookings_rls.sql apps/admin/src/lib/database.types.ts apps/web/src/lib/database.types.ts
git commit -m "feat(db): RLS customer-scoped para bookings/credits/waitlist (web)"
```

---

### Task 2: Tipos y servicios de reservaciones y créditos (web)

**Files:**
- Create: `apps/web/src/features/bookings/types/Booking.ts`
- Create: `apps/web/src/features/bookings/types/WaitlistEntry.ts`
- Create: `apps/web/src/features/bookings/services/bookingsService.ts`
- Create: `apps/web/src/features/credits/services/creditsService.ts`

**Interfaces:**
- Consumes: tablas/RPCs de Task 1 (ya en `database.types.ts`).
- Produce: tipos `BookingWithClass`, `WaitlistEntryWithClass`, `CreditBalance`.
- Produce: `listMyBookings()`, `listMyWaitlist()`, `bookClass(classId)`, `cancelBooking(bookingId)`, `joinWaitlist(classId)`, `leaveWaitlist(waitlistId)`, `getMyCreditBalance()`.

- [ ] **Step 1: Crear `features/bookings/types/Booking.ts`**

```typescript
// apps/web/src/features/bookings/types/Booking.ts

export type BookingStatus = "CONFIRMED" | "CANCELLED";

export type Booking = {
  id: string;
  businessId: string;
  classId: string;
  customerId: string;
  status: BookingStatus;
  createdAt: string;
  updatedAt: string;
};

export type BookingWithClass = Booking & {
  class: {
    id: string;
    title: string;
    startsAt: string;
    endsAt: string;
    instructorName: string | null;
  };
};
```

- [ ] **Step 2: Crear `features/bookings/types/WaitlistEntry.ts`**

```typescript
// apps/web/src/features/bookings/types/WaitlistEntry.ts

export type WaitlistEntry = {
  id: string;
  businessId: string;
  classId: string;
  customerId: string;
  createdAt: string;
};

export type WaitlistEntryWithClass = WaitlistEntry & {
  class: {
    id: string;
    title: string;
    startsAt: string;
    endsAt: string;
    instructorName: string | null;
  };
  position: number; // 1-based FIFO position
};
```

- [ ] **Step 3: Crear `features/bookings/services/bookingsService.ts`**

```typescript
// apps/web/src/features/bookings/services/bookingsService.ts
import { supabase } from "@/lib/supabaseClient";
import type { Booking, BookingWithClass, WaitlistEntry, WaitlistEntryWithClass } from "../types";

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

type BookingWithClassRow = BookingRow & {
  studio_classes: {
    id: string;
    title: string;
    starts_at: string;
    ends_at: string;
    instructors: { full_name: string } | null;
  } | null;
};

type WaitlistWithClassRow = WaitlistRow & {
  studio_classes: {
    id: string;
    title: string;
    starts_at: string;
    ends_at: string;
    instructors: { full_name: string } | null;
  } | null;
};

export async function listMyBookings(): Promise<BookingWithClass[]> {
  const { data, error } = await supabase
    .from("bookings")
    .select(`${BOOKING_COLUMNS}, studio_classes(id, title, starts_at, ends_at, instructors(full_name))`)
    .eq("status", "CONFIRMED")
    .order("created_at", { ascending: false });

  if (error) throw error;

  return (data as BookingWithClassRow[]).map((row) => ({
    ...toBooking(row),
    class: row.studio_classes
      ? {
          id: row.studio_classes.id,
          title: row.studio_classes.title,
          startsAt: row.studio_classes.starts_at,
          endsAt: row.studio_classes.ends_at,
          instructorName: row.studio_classes.instructors?.full_name ?? null,
        }
      : {
          id: row.class_id,
          title: "Clase eliminada",
          startsAt: "",
          endsAt: "",
          instructorName: null,
        },
  }));
}

export async function listMyWaitlist(): Promise<WaitlistEntryWithClass[]> {
  const { data, error } = await supabase
    .from("waitlist")
    .select(`${WAITLIST_COLUMNS}, studio_classes(id, title, starts_at, ends_at, instructors(full_name))`)
    .order("created_at", { ascending: true });

  if (error) throw error;

  // Calcular posición FIFO (1-based) por clase
  const positionByClass = new Map<string, number>();
  const entries = (data as WaitlistWithClassRow[]).map((row) => {
    const classId = row.class_id;
    const pos = (positionByClass.get(classId) ?? 0) + 1;
    positionByClass.set(classId, pos);
    return {
      ...toWaitlistEntry(row),
      class: row.studio_classes
        ? {
            id: row.studio_classes.id,
            title: row.studio_classes.title,
            startsAt: row.studio_classes.starts_at,
            endsAt: row.studio_classes.ends_at,
            instructorName: row.studio_classes.instructors?.full_name ?? null,
          }
        : {
            id: row.class_id,
            title: "Clase eliminada",
            startsAt: "",
            endsAt: "",
            instructorName: null,
          },
      position: pos,
    };
  });

  return entries;
}

export async function bookClass(classId: string): Promise<Booking> {
  const { data, error } = await supabase.rpc("book_class", {
    p_customer_id: (await supabase.auth.getUser()).data.user?.id,
    p_class_id: classId,
  });
  if (error) throw error;
  return toBooking(data as BookingRow);
}

export async function cancelBooking(bookingId: string): Promise<void> {
  const { error } = await supabase.rpc("cancel_booking", { p_booking_id: bookingId });
  if (error) throw error;
}

export async function joinWaitlist(classId: string): Promise<WaitlistEntry> {
  const user = (await supabase.auth.getUser()).data.user;
  if (!user) throw new Error("Usuario no autenticado");

  const { data: businessData, error: bizError } = await supabase
    .from("studio_classes")
    .select("business_id")
    .eq("id", classId)
    .single();
  if (bizError) throw bizError;

  const { data, error } = await supabase
    .from("waitlist")
    .insert({
      business_id: businessData.business_id,
      class_id: classId,
      customer_id: user.id,
    })
    .select(WAITLIST_COLUMNS)
    .single();

  if (error) throw error;
  return toWaitlistEntry(data);
}

export async function leaveWaitlist(waitlistId: string): Promise<void> {
  const { error } = await supabase.from("waitlist").delete().eq("id", waitlistId);
  if (error) throw error;
}
```

- [ ] **Step 4: Crear `features/credits/services/creditsService.ts`**

```typescript
// apps/web/src/features/credits/services/creditsService.ts
import { supabase } from "@/lib/supabaseClient";

export async function getMyCreditBalance(): Promise<number> {
  const { data, error } = await supabase
    .from("customer_credits_ledger")
    .select("delta");

  if (error) throw error;
  return data.reduce((sum, row) => sum + row.delta, 0);
}
```

- [ ] **Step 5: Typecheck**

Run: `cd apps/web && npm run typecheck`
Expected: sin errores. Ajusta casts si `database.types.ts` infiere embeds distintos (objeto vs array).

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/features/bookings/types apps/web/src/features/bookings/services apps/web/src/features/credits/services
git commit -m "feat(web): tipos y servicios de reservaciones, lista de espera y créditos"
```

---

### Task 3: Hooks y componentes de reservaciones

**Files:**
- Create: `apps/web/src/features/bookings/hooks/useMyBookings.ts`
- Create: `apps/web/src/features/bookings/hooks/useClassBooking.ts`
- Create: `apps/web/src/features/bookings/components/BookingCard.tsx`
- Create: `apps/web/src/features/bookings/components/WaitlistCard.tsx`
- Create: `apps/web/src/features/credits/hooks/useMyCredits.ts`
- Create: `apps/web/src/features/credits/components/CreditsBadge.tsx`

**Interfaces:**
- `useMyBookings()` → `{ bookings: BookingWithClass[]; waitlist: WaitlistEntryWithClass[]; loading; error; reload }`
- `useClassBooking(classId: string)` → `{ book: () => Promise<void>; cancel: (bookingId) => Promise<void>; joinWaitlist: () => Promise<void>; leaveWaitlist: (waitlistId) => Promise<void>; loading; error }`
- `useMyCredits()` → `{ balance: number; loading; error; reload }`
- Componentes: `BookingCard` (clase + botón cancelar), `WaitlistCard` (clase + posición + botón salir), `CreditsBadge` (número con icono)

- [ ] **Step 1: Crear `hooks/useMyBookings.ts`**

```typescript
// apps/web/src/features/bookings/hooks/useMyBookings.ts
import { useCallback, useEffect, useState } from "react";
import { listMyBookings, listMyWaitlist } from "../services/bookingsService";
import type { BookingWithClass, WaitlistEntryWithClass } from "../types";

export function useMyBookings() {
  const [bookings, setBookings] = useState<BookingWithClass[]>([]);
  const [waitlist, setWaitlist] = useState<WaitlistEntryWithClass[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [bookingsData, waitlistData] = await Promise.all([
        listMyBookings(),
        listMyWaitlist(),
      ]);
      setBookings(bookingsData);
      setWaitlist(waitlistData);
    } catch (err) {
      setError("No se pudieron cargar tus reservaciones.");
      console.error("[bookings-web] reload fallo", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  return { bookings, waitlist, loading, error, reload };
}
```

- [ ] **Step 2: Crear `hooks/useClassBooking.ts`**

```typescript
// apps/web/src/features/bookings/hooks/useClassBooking.ts
import { useCallback, useState } from "react";
import {
  bookClass,
  cancelBooking,
  joinWaitlist,
  leaveWaitlist,
} from "../services/bookingsService";
import { getErrorMessage } from "@/utils/getErrorMessage";

export function useClassBooking(classId: string) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function book() {
    setLoading(true);
    setError(null);
    try {
      await bookClass(classId);
    } catch (err) {
      setError(getErrorMessage(err, "No se pudo reservar la clase."));
      throw err;
    } finally {
      setLoading(false);
    }
  }

  async function cancel(bookingId: string) {
    setLoading(true);
    setError(null);
    try {
      await cancelBooking(bookingId);
    } catch (err) {
      setError(getErrorMessage(err, "No se pudo cancelar la reservación."));
      throw err;
    } finally {
      setLoading(false);
    }
  }

  async function joinWaitlistAction() {
    setLoading(true);
    setError(null);
    try {
      await joinWaitlist(classId);
    } catch (err) {
      setError(getErrorMessage(err, "No se pudo unir a la lista de espera."));
      throw err;
    } finally {
      setLoading(false);
    }
  }

  async function leaveWaitlistAction(waitlistId: string) {
    setLoading(true);
    setError(null);
    try {
      await leaveWaitlist(waitlistId);
    } catch (err) {
      setError(getErrorMessage(err, "No se pudo salir de la lista de espera."));
      throw err;
    } finally {
      setLoading(false);
    }
  }

  return { book, cancel, joinWaitlist: joinWaitlistAction, leaveWaitlist: leaveWaitlistAction, loading, error };
}
```

- [ ] **Step 3: Crear `components/BookingCard.tsx`**

```tsx
// apps/web/src/features/bookings/components/BookingCard.tsx
import { formatDate, formatTime } from "@/features/studio/components/ClassesCalendar";
import type { BookingWithClass } from "../types/Booking";

type Props = {
  booking: BookingWithClass;
  onCancel: (bookingId: string) => Promise<void>;
  loading?: boolean;
};

export function BookingCard({ booking, onCancel, loading }: Props) {
  const handleCancel = async () => {
    if (!window.confirm("¿Cancelar esta reservación? Se te devolverá el crédito.")) return;
    await onCancel(booking.id);
  };

  return (
    <article id={`booking-card-${booking.id}`} className="flex flex-col rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <h3 className="font-medium text-brand-primary">{booking.class.title}</h3>
          <div className="mt-2 flex flex-col gap-1 text-sm text-gray-600">
            <p className="flex items-center gap-1">
              <span className="font-medium">{formatDate(booking.class.startsAt)}</span>
              <span className="text-gray-400">·</span>
              <span>{formatTime(booking.class.startsAt)} – {formatTime(booking.class.endsAt)}</span>
            </p>
            {booking.class.instructorName && (
              <p className="flex items-center gap-1">
                <span className="font-medium">{booking.class.instructorName}</span>
              </p>
            )}
          </div>
        </div>
        <button
          type="button"
          onClick={handleCancel}
          disabled={loading}
          className="flex-shrink-0 rounded-md border border-red-300 bg-red-50 px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-100 disabled:opacity-50"
        >
          Cancelar
        </button>
      </div>
    </article>
  );
}
```

- [ ] **Step 4: Crear `components/WaitlistCard.tsx`**

```tsx
// apps/web/src/features/bookings/components/WaitlistCard.tsx
import { formatDate, formatTime } from "@/features/studio/components/ClassesCalendar";
import type { WaitlistEntryWithClass } from "../types/WaitlistEntry";

type Props = {
  entry: WaitlistEntryWithClass;
  onLeave: (waitlistId: string) => Promise<void>;
  loading?: boolean;
};

export function WaitlistCard({ entry, onLeave, loading }: Props) {
  const handleLeave = async () => {
    if (!window.confirm("¿Salir de la lista de espera?")) return;
    await onLeave(entry.id);
  };

  return (
    <article id={`waitlist-card-${entry.id}`} className="flex flex-col rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-800">
              Posición #{entry.position}
            </span>
            <h3 className="font-medium text-brand-primary">{entry.class.title}</h3>
          </div>
          <div className="mt-2 flex flex-col gap-1 text-sm text-gray-600">
            <p className="flex items-center gap-1">
              <span className="font-medium">{formatDate(entry.class.startsAt)}</span>
              <span className="text-gray-400">·</span>
              <span>{formatTime(entry.class.startsAt)} – {formatTime(entry.class.endsAt)}</span>
            </p>
            {entry.class.instructorName && (
              <p className="flex items-center gap-1">
                <span className="font-medium">{entry.class.instructorName}</span>
              </p>
            )}
          </div>
        </div>
        <button
          type="button"
          onClick={handleLeave}
          disabled={loading}
          className="flex-shrink-0 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
        >
          Salir
        </button>
      </div>
    </article>
  );
}
```

- [ ] **Step 5: Crear `hooks/useMyCredits.ts`**

```typescript
// apps/web/src/features/credits/hooks/useMyCredits.ts
import { useCallback, useEffect, useState } from "react";
import { getMyCreditBalance } from "../services/creditsService";

export function useMyCredits() {
  const [balance, setBalance] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setBalance(await getMyCreditBalance());
    } catch (err) {
      setError("No se pudo cargar tu balance de créditos.");
      console.error("[credits-web] reload fallo", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  return { balance, loading, error, reload };
}
```

- [ ] **Step 6: Crear `components/CreditsBadge.tsx`**

```tsx
// apps/web/src/features/credits/components/CreditsBadge.tsx
type Props = {
  balance: number | null;
  loading?: boolean;
  compact?: boolean;
};

export function CreditsBadge({ balance, loading, compact = false }: Props) {
  if (loading) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-3 py-1 text-sm font-medium text-gray-500">
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-gray-300" />
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-gray-300" />
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-gray-300" />
      </span>
    );
  }

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full bg-brand-primary/10 px-3 py-1 text-sm font-medium text-brand-primary ${compact ? "" : "text-base px-4 py-1.5"}`}>
      <span aria-hidden="true">💎</span>
      <span>{balance ?? 0}</span>
    </span>
  );
}
```

- [ ] **Step 7: Typecheck**

Run: `cd apps/web && npm run typecheck`
Expected: sin errores.

- [ ] **Step 8: Commit**

```bash
git add apps/web/src/features/bookings/hooks apps/web/src/features/bookings/components apps/web/src/features/credits/hooks apps/web/src/features/credits/components
git commit -m "feat(web): hooks y componentes de reservaciones, waitlist y créditos"
```

---

### Task 4: Página "Mi horario" (/my-bookings) y integración en ClassesCalendar

**Files:**
- Create: `apps/web/src/pages/MyBookingsPage.tsx`
- Modify: `apps/web/src/features/studio/components/ClassesCalendar.tsx` (botón reservar/waitlist)
- Modify: `apps/web/src/App.tsx` (ruta `/my-bookings`)
- Modify: `apps/web/src/layouts/MainLayout.tsx` (opcional: CreditsBadge en nav)
- Modify: `apps/web/src/features/studio/components/ClassesCalendarPage.tsx` (pasar balance a ClassesCalendar)

**Interfaces:**
- `/my-bookings`: muestra mis reservaciones (BookingCard) y waitlist (WaitlistCard), badge de créditos
- En `/classes`: cada clase tiene botón contextual según cupo/créditos/waitlist

- [ ] **Step 1: Crear `pages/MyBookingsPage.tsx`**

```tsx
// apps/web/src/pages/MyBookingsPage.tsx
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useMyBookings } from "@/features/bookings/hooks/useMyBookings";
import { useMyCredits } from "@/features/credits/hooks/useMyCredits";
import { BookingCard } from "@/features/bookings/components/BookingCard";
import { WaitlistCard } from "@/features/bookings/components/WaitlistCard";
import { CreditsBadge } from "@/features/credits/components/CreditsBadge";
import { Card, CardContent } from "@/components/ui/Card";

export function MyBookingsPage() {
  const { bookings, waitlist, loading, error, reload } = useMyBookings();
  const { balance, loading: creditsLoading, reload: reloadCredits } = useMyCredits();

  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    reload();
    reloadCredits();
  }, [reload, reloadCredits]);

  async function handleCancel(bookingId: string) {
    setActionLoading(bookingId);
    try {
      // need to import useClassBooking or call service directly
      const { cancelBooking } = await import("@/features/bookings/services/bookingsService");
      await cancelBooking(bookingId);
      await reload();
      await reloadCredits();
    } catch (err) {
      console.error("[my-bookings] cancel fallo", err);
    } finally {
      setActionLoading(null);
    }
  }

  async function handleLeaveWaitlist(waitlistId: string) {
    setActionLoading(waitlistId);
    try {
      const { leaveWaitlist } = await import("@/features/bookings/services/bookingsService");
      await leaveWaitlist(waitlistId);
      await reload();
    } catch (err) {
      console.error("[my-bookings] leave waitlist fallo", err);
    } finally {
      setActionLoading(null);
    }
  }

  return (
    <div id="my-bookings-page" className="mx-auto max-w-xl px-4 py-6 space-y-8 pb-24">
      <header className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-brand-primary">Mi horario</h1>
        <CreditsBadge balance={balance} loading={creditsLoading} />
      </header>

      {error && (
        <div className="rounded-md bg-red-50 p-4 text-sm text-red-600">{error}</div>
      )}

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Mis reservaciones</h2>
          <Link to="/classes" className="text-sm text-brand-primary hover:underline">
            Reservar más
          </Link>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12 text-gray-500">Cargando...</div>
        ) : bookings.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center text-center py-8">
              <span className="mb-3 text-4xl">📅</span>
              <h3 className="text-lg font-medium text-gray-900">No tienes reservaciones</h3>
              <p className="mt-1 text-sm text-gray-500">Explora las clases disponibles y reserva tu lugar.</p>
              <Link to="/classes" className="mt-4">
                <span className="text-brand-primary hover:underline">Ver horarios</span>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3" id="my-bookings-list">
            {bookings.map((booking) => (
              <BookingCard
                key={booking.id}
                booking={booking}
                onCancel={handleCancel}
                loading={actionLoading === booking.id}
              />
            ))}
          </div>
        )}
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-gray-900">Lista de espera</h2>

        {waitlist.length === 0 ? (
          <p className="text-sm text-gray-500">No estás en ninguna lista de espera.</p>
        ) : (
          <div className="space-y-3" id="my-waitlist-list">
            {waitlist.map((entry) => (
              <WaitlistCard
                key={entry.id}
                entry={entry}
                onLeave={handleLeaveWaitlist}
                loading={actionLoading === entry.id}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
```

- [ ] **Step 2: Modificar `ClassesCalendar.tsx` para botón contextual**

En `ClassesCalendar.tsx`, importar `useMyCredits` y `useMyBookings` (o pasar props desde padre). El componente necesita saber para cada clase:
- `isBooked: boolean` — si el usuario ya tiene booking CONFIRMED
- `isWaitlisted: boolean` + `waitlistId` — si está en waitlist
- `hasCredits: boolean` — balance > 0
- `hasCapacity: boolean` — `bookings.length < maxCapacity` (se calcula en padre)

Cambiar la tarjeta de clase para mostrar:
- Si `isBooked` → badge "Reservado" + botón "Cancelar"
- Si `!hasCapacity` y `isWaitlisted` → badge "En lista de espera (#N)" + botón "Salir"
- Si `!hasCapacity` y `!isWaitlisted` → botón "Unirse a lista de espera"
- Si `hasCapacity` y `hasCredits` → botón "Reservar"
- Si `hasCapacity` y `!hasCredits` → botón disabled "Sin créditos" + link a `/packages`

- [ ] **Step 3: Actualizar `ClassesCalendarPage.tsx` para calcular estado por clase**

En el hook/page, tras cargar `classes`, `bookings`, `waitlist`, `balance`:
```typescript
const bookingsByClass = new Map(bookings.map(b => [b.classId, b]));
const waitlistByClass = new Map(waitlist.map(w => [w.classId, w]));

const classesWithState = classes.map(cls => ({
  ...cls,
  isBooked: bookingsByClass.has(cls.id),
  isWaitlisted: waitlistByClass.has(cls.id),
  waitlistId: waitlistByClass.get(cls.id)?.id,
  waitlistPosition: waitlistByClass.get(cls.id)?.position,
  hasCapacity: cls.maxCapacity > (/* count bookings for this class */ 0), // ideally precomputed
}));
```

Pasar `classesWithState`, `balance`, y callbacks `onBook`, `onCancel`, `onJoinWaitlist`, `onLeaveWaitlist` a `ClassesCalendar`.

- [ ] **Step 4: Registrar ruta `/my-bookings` en `App.tsx`**

```tsx
import { MyBookingsPage } from "@/pages/MyBookingsPage";

// Dentro de <Routes> bajo RequireAuth + MainLayout:
<Route path="/my-bookings" element={<MyBookingsPage />} />
```

- [ ] **Step 5: Opcional - CreditsBadge en MainLayout/BottomNavigation**

En `MainLayout.tsx` o `BottomNavigation.tsx`, usar `useMyCredits()` y mostrar `CreditsBadge` junto al icono de usuario.

- [ ] **Step 6: Typecheck, lint, build**

Run: `cd apps/web && npm run typecheck && npm run lint && npm run build`

- [ ] **Step 7: Commit**

```bash
git add apps/web/src/pages/MyBookingsPage.tsx apps/web/src/features/studio/components/ClassesCalendar.tsx apps/web/src/features/studio/components/ClassesCalendarPage.tsx apps/web/src/App.tsx apps/web/src/layouts/MainLayout.tsx
git commit -m "feat(web): página Mi horario + botones reservar/waitlist en calendario"
```

---

### Task 5: Verificación end-to-end y documentación

**Files:**
- Modify: `docs/CURRENT_STATE.md`

**Interfaces:**
- Consume: toda la funcionalidad de Tasks 1-4.

- [ ] **Step 1: Verificación manual end-to-end en navegador**

Con `npm run dev:web` y sesión iniciada como cliente (rol CUSTOMER):

1. Usuario con 0 créditos ve badge "💎 0" en nav → en `/classes` botones "Reservar" disabled con tooltip "Sin créditos"
2. Usuario con 3 créditos (otorgados desde admin o futuro Stripe) reserva una clase con cupo → badge cambia a "💎 2", clase aparece en `/my-bookings`
3. Usuario intenta reservar la misma clase otra vez → error RPC "ya tiene una reservacion activa"
4. Usuario reserva hasta llenar cupo de una clase (crear clase de prueba con maxCapacity=1) → siguiente clase llena muestra "Unirse a lista de espera"
5. Usuario se une a waitlist → aparece en "Lista de espera" en `/my-bookings` con posición #1
6. Usuario sale de waitlist → desaparece de la lista
7. Staff en admin cancela una reservación para liberar cupo → promueve al usuario de waitlist → usuario ve la clase en "Mis reservaciones", badge baja 1 (verificar que funciona aunque sea staff quien promueve)
8. Usuario con 0 créditos en waitlist es promovido por staff → la RPC falla con "no tiene creditos disponibles", usuario sigue en waitlist
9. Usuario cancela su reservación desde `/my-bookings` → `confirm()`, crédito devuelto, badge actualizado, clase desaparece
10. Escape cierra modales si los hay, loading states evitan double-click

- [ ] **Step 2: Actualizar `docs/CURRENT_STATE.md`**

Añadir sección "Reservaciones, lista de espera y créditos en `apps_web`" describiendo: balance de créditos visible, reservar/cancelar propia clase, lista de espera FIFO con join/leave, botones contextuales en calendario, página `/my-bookings`. Actualizar roadmap: este sub-proyecto completo → siguiente **Pagos (Stripe)**.

- [ ] **Step 3: Commit**

```bash
git add docs/CURRENT_STATE.md
git commit -m "docs: reservaciones+créditos+waitlist en web completado, siguiente Stripe"
```

---

### Task 6: Push y Pull Request

- [ ] Push rama `feat/web-bookings-credits-waitlist` a origin.
- [ ] Abrir PR hacia `develop` con título "feat(web): Reservaciones, créditos y lista de espera cliente".
- [ ] Mergear tras revisión.
- [ ] Limpiar worktree y rama local/remota.