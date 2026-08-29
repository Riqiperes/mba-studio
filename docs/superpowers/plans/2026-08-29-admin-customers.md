# Clientes + Alumnos en apps/admin Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Directorio de clientes, CRUD de Alumnos (dependientes) por cliente, vista global de Alumnos, y un Inicio (`HomePage`) rediseñado como panel de botones grandes hacia cada sección del admin.

**Architecture:** Feature-First (`apps/admin/src/features/customers/`, `features/dependents/`), mismo patrón `Page → componente → hook → service → Supabase` ya usado en instructores/clases/paquetes. `customers` es un alias de lectura/edición sobre `profiles` (sin tabla nueva); `dependents` es tabla nueva.

**Tech Stack:** React + Vite + TypeScript strict, Tailwind CSS v4, Supabase (Postgres + RLS + supabase-js tipado con `Database` generado), Zod, React Router v6.

**Spec:** `docs/superpowers/specs/2026-08-29-admin-customers-design.md`

## Global Constraints

- La UI siempre dice "Alumno", nunca "Dependiente" — la tabla/columnas/tipos en código se llaman `dependent(s)` (inglés, lógica interna), pero ningún texto visible al usuario usa esa palabra.
- Alumnos nunca se borran (hard delete), solo se desactivan (`active = false`). Clientes no tienen alta/baja en este sub-proyecto (no hay ese campo en `profiles`, fuera de alcance).
- Todo `<form>` usa `noValidate` (la validación nativa del navegador bloquea el submit antes de que corra Zod si no se pone esto).
- El proyecto no tiene test runner en `apps/admin` — verificación es `npm run typecheck` / `npm run lint` / `npm run build` por tarea, más verificación manual end-to-end en navegador real en la tarea final.
- `"exactOptionalPropertyTypes": true` en `tsconfig.base.json` — cualquier payload de `.update()` de Supabase con campos opcionales se tipa de forma estructural y se asigna condicionalmente (`if (input.x !== undefined) updateData.x = input.x`), nunca `Record<string, ...> as any`.
- No se expone el email del cliente en ninguna pantalla de admin.
- No hay alta manual de clientes desde admin — los clientes solo existen vía signup (Google/email); admin únicamente ve/edita perfiles ya existentes con rol `CUSTOMER`.
- RLS de `dependents`: solo staff/admin del negocio (`dependents_manage_staff`). Sin policy de autoservicio del cliente (`guardian_id = auth.uid()`) todavía — se agrega en el sub-proyecto futuro de autoservicio en `apps/web`.
- Sin cambios de esquema fuera de la tabla nueva `dependents` (migración `010`) — `profiles` y su RLS existente no se tocan.

---

### Task 1: Migración `dependents` + regenerar tipos

**Files:**
- Create: `supabase/migrations/010_dependents.sql`
- Modify: `apps/admin/src/lib/database.types.ts` (regenerado completo)
- Modify: `apps/web/src/lib/database.types.ts` (regenerado completo, mismo proyecto de Supabase — se mantiene en sync aunque `apps/web` no use `dependents` todavía, mismo patrón ya usado para `packages`)

**Interfaces:**
- Produces: tabla `public.dependents` (`id`, `business_id`, `guardian_id`, `full_name`, `birth_date`, `active`, `created_at`, `updated_at`) con RLS `dependents_manage_staff`, disponible para las tareas siguientes vía el cliente Supabase tipado.

- [ ] **Step 1: Crear el archivo de migración**

```sql
-- supabase/migrations/010_dependents.sql
-- Tabla dependents: alumnos (ej. hijos) de un cliente (profiles), usados
-- para inscripciones de Academia. La UI siempre los llama "Alumno", nunca
-- "Dependiente" -- ver docs/superpowers/specs/2026-08-29-admin-customers-design.md.

create table public.dependents (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.business (id),
  guardian_id uuid not null references public.profiles (id),
  full_name text not null,
  birth_date date,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index dependents_business_id_idx on public.dependents (business_id);
create index dependents_guardian_id_idx on public.dependents (guardian_id);

alter table public.dependents enable row level security;

-- Solo staff/admin del negocio pueden leer o escribir alumnos. Sin policy
-- de autoservicio del cliente todavia -- se agrega cuando exista una
-- pantalla real en apps/web que la use (ver Global Constraints del plan).
create policy "dependents_manage_staff"
  on public.dependents
  for all
  using (
    public.current_user_role() = 'SUPER_ADMIN'
    or (
      business_id = public.current_user_business_id()
      and public.current_user_role() in ('STAFF', 'BUSINESS_ADMIN')
    )
  )
  with check (
    public.current_user_role() = 'SUPER_ADMIN'
    or (
      business_id = public.current_user_business_id()
      and public.current_user_role() in ('STAFF', 'BUSINESS_ADMIN')
    )
  );
```

- [ ] **Step 2: Aplicar la migración al proyecto de Supabase de desarrollo**

Usa la tool `mcp__claude_ai_Supabase__apply_migration` con `project_id: "eazyblybekyygimqpjjw"`, `name: "010_dependents"`, y `query` = el contenido exacto del archivo del Step 1. Si esa tool no está disponible en tu entorno, aplica el SQL manualmente desde el SQL Editor del dashboard de Supabase del proyecto `eazyblybekyygimqpjjw` (mismo método ya usado para la migración `009`).

Expected: sin errores. Confirma con `mcp__claude_ai_Supabase__list_tables` (o `select * from public.dependents limit 1;` en el SQL Editor) que la tabla existe.

- [ ] **Step 3: Regenerar los tipos TypeScript en ambas apps**

Usa la tool `mcp__claude_ai_Supabase__generate_typescript_types` con `project_id: "eazyblybekyygimqpjjw"`. Guarda el resultado completo (sobrescribiendo el archivo entero) en:
- `apps/admin/src/lib/database.types.ts`
- `apps/web/src/lib/database.types.ts`

Si la tool no está disponible, usa `supabase gen types typescript --project-id eazyblybekyygimqpjjw` (Supabase CLI) y guarda la salida en ambos archivos.

- [ ] **Step 4: Verificar advisors de seguridad**

Corre `mcp__claude_ai_Supabase__get_advisors` con `project_id: "eazyblybekyygimqpjjw"` y `type: "security"`. Confirma que no aparece ninguna advertencia nueva sobre la tabla `dependents` (ej. RLS deshabilitado). Si aparece algo, corrígelo en el mismo archivo de migración antes de continuar (la migración todavía no está commiteada).

- [ ] **Step 5: Verificar que ambas apps siguen compilando**

Run: `cd apps/admin && npm run typecheck && cd ../web && npm run typecheck`
Expected: sin errores en ninguna de las dos apps (la regeneración de tipos no debe romper nada existente).

- [ ] **Step 6: Commit**

```bash
git add supabase/migrations/010_dependents.sql apps/admin/src/lib/database.types.ts apps/web/src/lib/database.types.ts
git commit -m "feat(db): tabla dependents (alumnos) con RLS staff-only"
```

---

### Task 2: Clientes — tipos y service

**Files:**
- Create: `apps/admin/src/features/customers/types/Customer.ts`
- Create: `apps/admin/src/features/customers/services/customersService.ts`
- Create: `apps/admin/src/features/customers/hooks/useCustomers.ts`

**Interfaces:**
- Consumes: tabla `public.profiles` (ya existente, tipada por `database.types.ts` de Task 1 — sin cambios de esquema aquí).
- Produces: `type Customer = { id: string; businessId: string; fullName: string | null; phone: string | null; createdAt: string; updatedAt: string }`
- Produces: `listCustomers(): Promise<Customer[]>`
- Produces: `getCustomer(id: string): Promise<Customer>`
- Produces: `updateCustomer(id: string, input: { fullName?: string; phone?: string | null }): Promise<Customer>`
- Produces: hook `useCustomers()` → `{ customers: Customer[]; loading: boolean; error: string | null; reload: () => Promise<void> }`
- Produces: hook `useCustomer(id: string)` → `{ customer: Customer | null; loading: boolean; error: string | null; reload: () => Promise<void>; update: (input: { fullName?: string; phone?: string | null }) => Promise<void> }`

- [ ] **Step 1: Crear el tipo `Customer`**

```typescript
// apps/admin/src/features/customers/types/Customer.ts

/**
 * Forma en camelCase de una fila de `profiles` con rol CUSTOMER (ver
 * supabase/migrations/002_profiles.sql). El mapeo snake_case ->
 * camelCase vive en features/customers/services/customersService.ts.
 */
export type Customer = {
  id: string;
  businessId: string;
  fullName: string | null;
  phone: string | null;
  createdAt: string;
  updatedAt: string;
};
```

- [ ] **Step 2: Crear `customersService.ts`**

```typescript
// apps/admin/src/features/customers/services/customersService.ts
import { supabase } from "@/lib/supabaseClient";
import type { Customer } from "../types/Customer";

const SELECT_COLUMNS = "id, business_id, full_name, phone, created_at, updated_at";

type CustomerRow = {
  id: string;
  business_id: string;
  full_name: string | null;
  phone: string | null;
  created_at: string;
  updated_at: string;
};

function toCustomer(row: CustomerRow): Customer {
  return {
    id: row.id,
    businessId: row.business_id,
    fullName: row.full_name,
    phone: row.phone,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function listCustomers(): Promise<Customer[]> {
  const { data, error } = await supabase
    .from("profiles")
    .select(SELECT_COLUMNS)
    .eq("role", "CUSTOMER")
    .order("full_name", { ascending: true });

  if (error) throw error;
  return data.map(toCustomer);
}

export async function getCustomer(id: string): Promise<Customer> {
  const { data, error } = await supabase
    .from("profiles")
    .select(SELECT_COLUMNS)
    .eq("id", id)
    .single();

  if (error) throw error;
  return toCustomer(data);
}

export async function updateCustomer(
  id: string,
  input: { fullName?: string; phone?: string | null },
): Promise<Customer> {
  const updateData: { full_name?: string; phone?: string | null } = {};

  if (input.fullName !== undefined) updateData.full_name = input.fullName;
  if (input.phone !== undefined) updateData.phone = input.phone;

  const { data, error } = await supabase
    .from("profiles")
    .update(updateData)
    .eq("id", id)
    .select(SELECT_COLUMNS)
    .single();

  if (error) throw error;
  return toCustomer(data);
}
```

- [ ] **Step 3: Crear `useCustomers.ts`**

```typescript
// apps/admin/src/features/customers/hooks/useCustomers.ts
import { useCallback, useEffect, useState } from "react";
import { getCustomer, listCustomers, updateCustomer } from "../services/customersService";
import type { Customer } from "../types/Customer";

export function useCustomers() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setCustomers(await listCustomers());
    } catch (err) {
      setError("No se pudieron cargar los clientes.");
      console.error("[customers] listCustomers fallo", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  return { customers, loading, error, reload };
}

export function useCustomer(id: string) {
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setCustomer(await getCustomer(id));
    } catch (err) {
      setError("No se pudo cargar el cliente.");
      console.error("[customers] getCustomer fallo", err);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    reload();
  }, [reload]);

  async function update(input: { fullName?: string; phone?: string | null }) {
    setCustomer(await updateCustomer(id, input));
  }

  return { customer, loading, error, reload, update };
}
```

- [ ] **Step 4: Typecheck**

Run: `cd apps/admin && npm run typecheck`
Expected: sin errores.

- [ ] **Step 5: Commit**

```bash
git add apps/admin/src/features/customers
git commit -m "feat(admin): capa de datos de clientes"
```

---

### Task 3: Alumnos — tipos y service

**Files:**
- Create: `apps/admin/src/features/dependents/types/Dependent.ts`
- Create: `apps/admin/src/features/dependents/services/dependentsService.ts`
- Create: `apps/admin/src/features/dependents/hooks/useDependents.ts`
- Create: `apps/admin/src/features/dependents/hooks/useAllDependents.ts`

**Interfaces:**
- Consumes: tabla `public.dependents` (Task 1). `guardianId` de un `Customer` (Task 2) para crear/filtrar.
- Produces: `type Dependent = { id: string; businessId: string; guardianId: string; fullName: string; birthDate: string | null; active: boolean; createdAt: string; updatedAt: string }`
- Produces: `type DependentWithGuardian = Dependent & { guardianName: string | null }`
- Produces: `listDependentsByGuardian(guardianId: string): Promise<Dependent[]>`
- Produces: `listAllDependents(): Promise<DependentWithGuardian[]>`
- Produces: `createDependent(businessId: string, guardianId: string, input: { fullName: string; birthDate?: string | null }): Promise<Dependent>`
- Produces: `updateDependent(id: string, input: { fullName?: string; birthDate?: string | null }): Promise<Dependent>`
- Produces: `setDependentActive(id: string, active: boolean): Promise<void>`
- Produces: hook `useDependentsByGuardian(guardianId: string)` (en `hooks/useDependents.ts`) → `{ dependents: Dependent[]; loading: boolean; error: string | null; reload: () => Promise<void>; create: (input: { fullName: string; birthDate?: string | null }) => Promise<void>; update: (id: string, input: { fullName?: string; birthDate?: string | null }) => Promise<void>; setActive: (id: string, active: boolean) => Promise<void> }`. Necesita `businessId` (de un `Customer`) para `create` — recíbelo como segundo argumento del hook: `useDependentsByGuardian(guardianId: string, businessId: string)`.
- Produces: hook `useAllDependents()` (en `hooks/useAllDependents.ts`) → `{ dependents: DependentWithGuardian[]; loading: boolean; error: string | null; reload: () => Promise<void> }` (solo lectura).

- [ ] **Step 1: Crear el tipo `Dependent`**

```typescript
// apps/admin/src/features/dependents/types/Dependent.ts

/**
 * Forma en camelCase de una fila de `dependents` (ver
 * supabase/migrations/010_dependents.sql). La UI siempre muestra este
 * concepto como "Alumno", nunca "Dependiente" -- ver
 * docs/superpowers/specs/2026-08-29-admin-customers-design.md. El mapeo
 * snake_case -> camelCase vive en
 * features/dependents/services/dependentsService.ts.
 */
export type Dependent = {
  id: string;
  businessId: string;
  guardianId: string;
  fullName: string;
  birthDate: string | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
};

/** Usado por la vista global de alumnos (`StudentsPage`). */
export type DependentWithGuardian = Dependent & { guardianName: string | null };
```

- [ ] **Step 2: Crear `dependentsService.ts`**

```typescript
// apps/admin/src/features/dependents/services/dependentsService.ts
import { supabase } from "@/lib/supabaseClient";
import type { Dependent, DependentWithGuardian } from "../types/Dependent";

const SELECT_COLUMNS =
  "id, business_id, guardian_id, full_name, birth_date, active, created_at, updated_at";

type DependentRow = {
  id: string;
  business_id: string;
  guardian_id: string;
  full_name: string;
  birth_date: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
};

function toDependent(row: DependentRow): Dependent {
  return {
    id: row.id,
    businessId: row.business_id,
    guardianId: row.guardian_id,
    fullName: row.full_name,
    birthDate: row.birth_date,
    active: row.active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function listDependentsByGuardian(guardianId: string): Promise<Dependent[]> {
  const { data, error } = await supabase
    .from("dependents")
    .select(SELECT_COLUMNS)
    .eq("guardian_id", guardianId)
    .order("full_name", { ascending: true });

  if (error) throw error;
  return data.map(toDependent);
}

type DependentWithGuardianRow = DependentRow & {
  profiles: { full_name: string | null } | null;
};

export async function listAllDependents(): Promise<DependentWithGuardian[]> {
  const { data, error } = await supabase
    .from("dependents")
    .select(`${SELECT_COLUMNS}, profiles(full_name)`)
    .order("full_name", { ascending: true });

  if (error) throw error;
  return (data as DependentWithGuardianRow[]).map((row) => ({
    ...toDependent(row),
    guardianName: row.profiles?.full_name ?? null,
  }));
}

export async function createDependent(
  businessId: string,
  guardianId: string,
  input: { fullName: string; birthDate?: string | null },
): Promise<Dependent> {
  const { data, error } = await supabase
    .from("dependents")
    .insert({
      business_id: businessId,
      guardian_id: guardianId,
      full_name: input.fullName,
      birth_date: input.birthDate ?? null,
    })
    .select(SELECT_COLUMNS)
    .single();

  if (error) throw error;
  return toDependent(data);
}

export async function updateDependent(
  id: string,
  input: { fullName?: string; birthDate?: string | null },
): Promise<Dependent> {
  const updateData: { full_name?: string; birth_date?: string | null } = {};

  if (input.fullName !== undefined) updateData.full_name = input.fullName;
  if (input.birthDate !== undefined) updateData.birth_date = input.birthDate;

  const { data, error } = await supabase
    .from("dependents")
    .update(updateData)
    .eq("id", id)
    .select(SELECT_COLUMNS)
    .single();

  if (error) throw error;
  return toDependent(data);
}

export async function setDependentActive(id: string, active: boolean): Promise<void> {
  const { error } = await supabase.from("dependents").update({ active }).eq("id", id);
  if (error) throw error;
}
```

- [ ] **Step 3: Crear `hooks/useDependents.ts`**

```typescript
// apps/admin/src/features/dependents/hooks/useDependents.ts
import { useCallback, useEffect, useState } from "react";
import {
  createDependent,
  listDependentsByGuardian,
  setDependentActive,
  updateDependent,
} from "../services/dependentsService";
import type { Dependent } from "../types/Dependent";

type DependentInput = { fullName: string; birthDate?: string | null };

export function useDependentsByGuardian(guardianId: string, businessId: string) {
  const [dependents, setDependents] = useState<Dependent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setDependents(await listDependentsByGuardian(guardianId));
    } catch (err) {
      setError("No se pudieron cargar los alumnos.");
      console.error("[dependents] listDependentsByGuardian fallo", err);
    } finally {
      setLoading(false);
    }
  }, [guardianId]);

  useEffect(() => {
    reload();
  }, [reload]);

  async function create(input: DependentInput) {
    await createDependent(businessId, guardianId, input);
    await reload();
  }

  async function update(id: string, input: DependentInput) {
    await updateDependent(id, input);
    await reload();
  }

  async function setActive(id: string, active: boolean) {
    await setDependentActive(id, active);
    await reload();
  }

  return { dependents, loading, error, reload, create, update, setActive };
}
```

- [ ] **Step 4: Crear `hooks/useAllDependents.ts`**

```typescript
// apps/admin/src/features/dependents/hooks/useAllDependents.ts
import { useCallback, useEffect, useState } from "react";
import { listAllDependents } from "../services/dependentsService";
import type { DependentWithGuardian } from "../types/Dependent";

export function useAllDependents() {
  const [dependents, setDependents] = useState<DependentWithGuardian[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setDependents(await listAllDependents());
    } catch (err) {
      setError("No se pudieron cargar los alumnos.");
      console.error("[dependents] listAllDependents fallo", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  return { dependents, loading, error, reload };
}
```

- [ ] **Step 5: Typecheck**

Run: `cd apps/admin && npm run typecheck`
Expected: sin errores. Presta atención especial al tipo de retorno de `listAllDependents` — si Supabase infiere `profiles` como array en vez de objeto por la relación embebida, ajusta `DependentWithGuardianRow` (`profiles: { full_name: string | null }[] | null` y toma `row.profiles?.[0]?.full_name`) según lo que el compilador exija realmente; la forma exacta depende de cómo `database.types.ts` haya inferido la FK única `dependents.guardian_id -> profiles.id`.

- [ ] **Step 6: Commit**

```bash
git add apps/admin/src/features/dependents
git commit -m "feat(admin): capa de datos de alumnos (dependents)"
```

---

### Task 4: Componentes compartidos de Alumnos

**Files:**
- Create: `apps/admin/src/features/dependents/components/DependentsTable.tsx`
- Create: `apps/admin/src/features/dependents/components/DependentFormModal.tsx`

**Interfaces:**
- Consumes: `Dependent`, `DependentWithGuardian` (Task 3).
- Produces: `<DependentsTable dependents={... } showGuardianColumn={boolean} onEdit={...} onToggleActive={...} />` — `onEdit`/`onToggleActive` son opcionales; si se omiten, no se renderiza la columna "Acciones" (usado por la vista de solo lectura de `StudentsPage` en Task 6).
- Produces: `<DependentFormModal open initialValue={Dependent | null} onClose onSubmit={(input: { fullName: string; birthDate?: string | null }) => Promise<void>} />`

- [ ] **Step 1: Crear `DependentsTable.tsx`**

```tsx
// apps/admin/src/features/dependents/components/DependentsTable.tsx
import type { Dependent, DependentWithGuardian } from "../types/Dependent";

type DependentRow = Dependent | DependentWithGuardian;

type Props = {
  dependents: DependentRow[];
  showGuardianColumn?: boolean;
  onEdit?: (dependent: Dependent) => void;
  onToggleActive?: (dependent: Dependent) => void;
};

function guardianName(dependent: DependentRow): string {
  return "guardianName" in dependent ? (dependent.guardianName ?? "-") : "-";
}

export function DependentsTable({ dependents, showGuardianColumn, onEdit, onToggleActive }: Props) {
  if (dependents.length === 0) {
    return <p className="text-sm text-gray-500">Todavia no hay alumnos.</p>;
  }

  const showActions = Boolean(onEdit || onToggleActive);

  return (
    <table id="dependents-table" className="w-full border-collapse text-sm">
      <thead>
        <tr className="border-b border-gray-200 text-left text-gray-500">
          <th className="py-2">Nombre</th>
          {showGuardianColumn && <th className="py-2">Tutor</th>}
          <th className="py-2">Fecha de nacimiento</th>
          <th className="py-2">Estado</th>
          {showActions && <th className="py-2">Acciones</th>}
        </tr>
      </thead>
      <tbody>
        {dependents.map((dependent) => (
          <tr key={dependent.id} className="border-b border-gray-100">
            <td className="py-2">{dependent.fullName}</td>
            {showGuardianColumn && <td className="py-2">{guardianName(dependent)}</td>}
            <td className="py-2">{dependent.birthDate ?? "-"}</td>
            <td className="py-2">
              <span
                className={
                  dependent.active
                    ? "rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-700"
                    : "rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500"
                }
              >
                {dependent.active ? "Activo" : "Inactivo"}
              </span>
            </td>
            {showActions && (
              <td className="py-2">
                {onEdit && (
                  <button
                    type="button"
                    onClick={() => onEdit(dependent)}
                    className="mr-3 text-brand-primary hover:underline"
                  >
                    Editar
                  </button>
                )}
                {onToggleActive && (
                  <button
                    type="button"
                    onClick={() => onToggleActive(dependent)}
                    className="text-gray-600 hover:underline"
                  >
                    {dependent.active ? "Desactivar" : "Activar"}
                  </button>
                )}
              </td>
            )}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
```

- [ ] **Step 2: Crear `DependentFormModal.tsx`**

```tsx
// apps/admin/src/features/dependents/components/DependentFormModal.tsx
import { useEffect, useState, type FormEvent } from "react";
import { z } from "zod";
import type { Dependent } from "../types/Dependent";

const schema = z.object({
  fullName: z.string().min(1, "El nombre es obligatorio"),
  birthDate: z
    .string()
    .refine((value) => value === "" || !isNaN(Date.parse(value)), {
      message: "Fecha de nacimiento invalida",
    })
    .refine((value) => value === "" || new Date(value) <= new Date(), {
      message: "La fecha de nacimiento no puede ser futura",
    }),
});

type DependentInput = { fullName: string; birthDate?: string | null };

type Props = {
  open: boolean;
  initialValue: Dependent | null;
  onClose: () => void;
  onSubmit: (input: DependentInput) => Promise<void>;
};

// Distingue el motivo real del rechazo (RLS vs constraint vs desconocido)
// en vez de un mensaje generico, igual que mapAuthError en apps/web.
function mapSaveError(err: unknown): string {
  const message = err instanceof Error ? err.message : "";
  if (message.includes("row-level security") || message.includes("42501")) {
    return "No tienes permiso para esta accion.";
  }
  if (message.includes("violates check constraint") || message.includes("violates not-null constraint")) {
    return "Revisa los datos del formulario.";
  }
  return "No se pudo guardar. Intenta de nuevo.";
}

export function DependentFormModal({ open, initialValue, onClose, onSubmit }: Props) {
  const [fullName, setFullName] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setFullName(initialValue?.fullName ?? "");
    setBirthDate(initialValue?.birthDate ?? "");
    setFieldErrors({});
    setFormError(null);
  }, [open, initialValue]);

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

    const result = schema.safeParse({ fullName, birthDate });
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
      await onSubmit({
        fullName: result.data.fullName,
        birthDate: result.data.birthDate ? result.data.birthDate : null,
      });
      onClose();
    } catch (err) {
      setFormError(mapSaveError(err));
      console.error("[dependents] guardar fallo", err);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/40 p-4">
      <form
        id="dependent-form-modal"
        onSubmit={handleSubmit}
        noValidate
        className="flex w-full max-w-sm flex-col gap-3 rounded-lg bg-white p-6"
      >
        <h2 className="text-lg font-semibold text-brand-primary">
          {initialValue ? "Editar alumno" : "Nuevo alumno"}
        </h2>

        <div className="flex flex-col gap-1">
          <input
            id="dependent-fullname-input"
            type="text"
            placeholder="Nombre completo"
            value={fullName}
            onChange={(event) => setFullName(event.target.value)}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
          {fieldErrors.fullName && <p className="text-xs text-red-600">{fieldErrors.fullName}</p>}
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="dependent-birthdate-input" className="text-xs text-gray-500">
            Fecha de nacimiento (opcional)
          </label>
          <input
            id="dependent-birthdate-input"
            type="date"
            value={birthDate}
            onChange={(event) => setBirthDate(event.target.value)}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
          {fieldErrors.birthDate && (
            <p className="text-xs text-red-600">{fieldErrors.birthDate}</p>
          )}
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
            {isSaving ? "Guardando..." : "Guardar"}
          </button>
        </div>

        {formError && <p className="text-sm text-red-600">{formError}</p>}
      </form>
    </div>
  );
}
```

- [ ] **Step 3: Typecheck, lint, build**

Run: `cd apps/admin && npm run typecheck && npm run lint && npm run build`
Expected: sin errores.

- [ ] **Step 4: Commit**

```bash
git add apps/admin/src/features/dependents/components
git commit -m "feat(admin): componentes de alumnos (tabla + formulario)"
```

---

### Task 5: Páginas de Clientes (lista + detalle)

**Files:**
- Create: `apps/admin/src/features/customers/components/CustomersTable.tsx`
- Create: `apps/admin/src/pages/CustomersPage.tsx`
- Create: `apps/admin/src/pages/CustomerDetailPage.tsx`
- Modify: `apps/admin/src/App.tsx` (rutas `/customers` y `/customers/:id`)

**Interfaces:**
- Consumes: `useCustomers`, `useCustomer` (Task 2); `useDependentsByGuardian`, `DependentsTable`, `DependentFormModal` (Tasks 3-4).
- Produces: rutas `/customers` y `/customers/:id`, ambas protegidas con `RequireAuth` + `AdminLayout`.

- [ ] **Step 1: Crear `CustomersTable.tsx`**

```tsx
// apps/admin/src/features/customers/components/CustomersTable.tsx
import { Link } from "react-router-dom";
import type { Customer } from "../types/Customer";

type Props = {
  customers: Customer[];
};

export function CustomersTable({ customers }: Props) {
  if (customers.length === 0) {
    return <p className="text-sm text-gray-500">Todavia no hay clientes.</p>;
  }

  return (
    <table id="customers-table" className="w-full border-collapse text-sm">
      <thead>
        <tr className="border-b border-gray-200 text-left text-gray-500">
          <th className="py-2">Nombre</th>
          <th className="py-2">Telefono</th>
          <th className="py-2">Acciones</th>
        </tr>
      </thead>
      <tbody>
        {customers.map((customer) => (
          <tr key={customer.id} className="border-b border-gray-100">
            <td className="py-2">{customer.fullName ?? "-"}</td>
            <td className="py-2">{customer.phone ?? "-"}</td>
            <td className="py-2">
              <Link to={`/customers/${customer.id}`} className="text-brand-primary hover:underline">
                Ver
              </Link>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
```

- [ ] **Step 2: Crear `CustomersPage.tsx`**

```tsx
// apps/admin/src/pages/CustomersPage.tsx
import { CustomersTable } from "@/features/customers/components/CustomersTable";
import { useCustomers } from "@/features/customers/hooks/useCustomers";

export function CustomersPage() {
  const { customers, loading, error } = useCustomers();

  return (
    <div id="customers-page" className="mx-auto max-w-3xl p-6">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-brand-primary">Clientes</h1>
      </div>

      {loading && <p className="text-sm text-gray-500">Cargando...</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}
      {!loading && !error && <CustomersTable customers={customers} />}
    </div>
  );
}
```

- [ ] **Step 3: Crear `CustomerDetailPage.tsx`**

```tsx
// apps/admin/src/pages/CustomerDetailPage.tsx
import { useEffect, useState, type FormEvent } from "react";
import { useParams } from "react-router-dom";
import { DependentFormModal } from "@/features/dependents/components/DependentFormModal";
import { DependentsTable } from "@/features/dependents/components/DependentsTable";
import { useDependentsByGuardian } from "@/features/dependents/hooks/useDependents";
import { useCustomer } from "@/features/customers/hooks/useCustomers";
import type { Dependent } from "@/features/dependents/types/Dependent";

export function CustomerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const customerId = id ?? "";
  const { customer, loading, error, update } = useCustomer(customerId);
  const { dependents, loading: dependentsLoading, error: dependentsError, create, update: updateDependent, setActive } =
    useDependentsByGuardian(customerId, customer?.businessId ?? "");

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [editError, setEditError] = useState<string | null>(null);
  const [isSavingCustomer, setIsSavingCustomer] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingDependent, setEditingDependent] = useState<Dependent | null>(null);
  const [dependentActionError, setDependentActionError] = useState<string | null>(null);

  useEffect(() => {
    if (!customer) return;
    setFullName(customer.fullName ?? "");
    setPhone(customer.phone ?? "");
  }, [customer]);

  async function handleSaveCustomer(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setEditError(null);
    setIsSavingCustomer(true);
    try {
      await update({ fullName: fullName || undefined, phone: phone || null });
    } catch (err) {
      setEditError("No se pudo actualizar el cliente. Intenta de nuevo.");
      console.error("[customers] update fallo", err);
    } finally {
      setIsSavingCustomer(false);
    }
  }

  function openCreateDependent() {
    setEditingDependent(null);
    setModalOpen(true);
  }

  function openEditDependent(dependent: Dependent) {
    setEditingDependent(dependent);
    setModalOpen(true);
  }

  async function handleDependentSubmit(input: { fullName: string; birthDate?: string | null }) {
    if (editingDependent) {
      await updateDependent(editingDependent.id, input);
    } else {
      await create(input);
    }
  }

  async function handleToggleDependentActive(dependent: Dependent) {
    if (dependent.active && !window.confirm(`Desactivar al alumno "${dependent.fullName}"?`)) {
      return;
    }
    setDependentActionError(null);
    try {
      await setActive(dependent.id, !dependent.active);
    } catch (err) {
      setDependentActionError("No se pudo actualizar el alumno. Intenta de nuevo.");
      console.error("[dependents] setActive fallo", err);
    }
  }

  if (loading) return <div className="mx-auto max-w-3xl p-6 text-sm text-gray-500">Cargando...</div>;
  if (error || !customer) {
    return <div className="mx-auto max-w-3xl p-6 text-sm text-red-600">{error ?? "Cliente no encontrado."}</div>;
  }

  return (
    <div id="customer-detail-page" className="mx-auto max-w-3xl p-6">
      <h1 className="mb-4 text-xl font-semibold text-brand-primary">
        {customer.fullName ?? "Cliente"}
      </h1>

      <form onSubmit={handleSaveCustomer} noValidate className="mb-6 flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1">
          <label htmlFor="customer-fullname-input" className="text-xs text-gray-500">
            Nombre
          </label>
          <input
            id="customer-fullname-input"
            type="text"
            value={fullName}
            onChange={(event) => setFullName(event.target.value)}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="customer-phone-input" className="text-xs text-gray-500">
            Telefono
          </label>
          <input
            id="customer-phone-input"
            type="text"
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
        </div>
        <button
          type="submit"
          disabled={isSavingCustomer}
          className="rounded-md bg-brand-primary px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
        >
          {isSavingCustomer ? "Guardando..." : "Guardar"}
        </button>
      </form>
      {editError && <p className="mb-4 text-sm text-red-600">{editError}</p>}

      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-brand-primary">Alumnos</h2>
        <button
          type="button"
          onClick={openCreateDependent}
          className="rounded-md bg-brand-primary px-4 py-2 text-sm font-medium text-white hover:opacity-90"
        >
          Nuevo alumno
        </button>
      </div>

      {dependentsLoading && <p className="text-sm text-gray-500">Cargando...</p>}
      {dependentsError && <p className="text-sm text-red-600">{dependentsError}</p>}
      {dependentActionError && <p className="text-sm text-red-600">{dependentActionError}</p>}
      {!dependentsLoading && !dependentsError && (
        <DependentsTable
          dependents={dependents}
          onEdit={openEditDependent}
          onToggleActive={handleToggleDependentActive}
        />
      )}

      <DependentFormModal
        open={modalOpen}
        initialValue={editingDependent}
        onClose={() => setModalOpen(false)}
        onSubmit={handleDependentSubmit}
      />
    </div>
  );
}
```

- [ ] **Step 4: Registrar las rutas en `App.tsx`**

```tsx
// apps/admin/src/App.tsx
// Agregar el import junto a los demas:
import { CustomersPage } from "@/pages/CustomersPage";
import { CustomerDetailPage } from "@/pages/CustomerDetailPage";

// Agregar dentro de <Routes>, junto a las rutas existentes:
          <Route
            path="/customers"
            element={
              <RequireAuth>
                <AdminLayout>
                  <CustomersPage />
                </AdminLayout>
              </RequireAuth>
            }
          />
          <Route
            path="/customers/:id"
            element={
              <RequireAuth>
                <AdminLayout>
                  <CustomerDetailPage />
                </AdminLayout>
              </RequireAuth>
            }
          />
```

- [ ] **Step 5: Typecheck, lint, build**

Run: `cd apps/admin && npm run typecheck && npm run lint && npm run build`
Expected: sin errores.

- [ ] **Step 6: Commit**

```bash
git add apps/admin/src/features/customers/components apps/admin/src/pages/CustomersPage.tsx apps/admin/src/pages/CustomerDetailPage.tsx apps/admin/src/App.tsx
git commit -m "feat(admin): paginas de clientes (lista + detalle con alumnos)"
```

---

### Task 6: Vista global de Alumnos

**Files:**
- Create: `apps/admin/src/pages/StudentsPage.tsx`
- Modify: `apps/admin/src/App.tsx` (ruta `/students`)

**Interfaces:**
- Consumes: `useAllDependents` (Task 3), `DependentsTable` (Task 4).
- Produces: ruta `/students`, protegida con `RequireAuth` + `AdminLayout`.

- [ ] **Step 1: Crear `StudentsPage.tsx`**

```tsx
// apps/admin/src/pages/StudentsPage.tsx
import { DependentsTable } from "@/features/dependents/components/DependentsTable";
import { useAllDependents } from "@/features/dependents/hooks/useAllDependents";

export function StudentsPage() {
  const { dependents, loading, error } = useAllDependents();

  return (
    <div id="students-page" className="mx-auto max-w-3xl p-6">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-brand-primary">Alumnos</h1>
      </div>

      {loading && <p className="text-sm text-gray-500">Cargando...</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}
      {!loading && !error && <DependentsTable dependents={dependents} showGuardianColumn />}
    </div>
  );
}
```

Sin acciones de editar/desactivar aqui a proposito (decision de diseno en el spec): esta vista es de solo lectura, para eso esta el detalle de cada cliente en `/customers/:id`.

- [ ] **Step 2: Registrar la ruta en `App.tsx`**

```tsx
// apps/admin/src/App.tsx
// Agregar el import:
import { StudentsPage } from "@/pages/StudentsPage";

// Agregar dentro de <Routes>:
          <Route
            path="/students"
            element={
              <RequireAuth>
                <AdminLayout>
                  <StudentsPage />
                </AdminLayout>
              </RequireAuth>
            }
          />
```

- [ ] **Step 3: Typecheck, lint, build**

Run: `cd apps/admin && npm run typecheck && npm run lint && npm run build`
Expected: sin errores.

- [ ] **Step 4: Commit**

```bash
git add apps/admin/src/pages/StudentsPage.tsx apps/admin/src/App.tsx
git commit -m "feat(admin): vista global de alumnos"
```

---

### Task 7: Panel de inicio, navegación y cierre

**Files:**
- Modify: `apps/admin/src/pages/HomePage.tsx`
- Modify: `apps/admin/src/layouts/AdminLayout.tsx`
- Modify: `docs/CURRENT_STATE.md`

**Interfaces:**
- Consumes: rutas ya registradas en Tasks 5-6 (`/customers`, `/students`) más las existentes (`/instructors`, `/classes`, `/packages`).
- Produces: `HomePage` como panel de botones grandes; `AdminLayout` con "Clientes" y "Alumnos" en la nav.

- [ ] **Step 1: Reescribir `HomePage.tsx` como panel de botones grandes**

Lee el archivo actual antes de sobrescribirlo (usa el `useAuth()` existente, no lo quites). Reemplaza el saludo de texto por un grid de links grandes:

```tsx
// apps/admin/src/pages/HomePage.tsx
import { Link } from "react-router-dom";
import { useAuth } from "@/features/auth/hooks/AuthProvider";

const PANEL_ITEMS = [
  { to: "/instructors", label: "Instructores" },
  { to: "/classes", label: "Clases" },
  { to: "/packages", label: "Paquetes" },
  { to: "/customers", label: "Clientes" },
  { to: "/students", label: "Alumnos" },
];

export function HomePage() {
  const { profile } = useAuth();

  return (
    <div id="admin-dashboard" className="mx-auto max-w-3xl p-12">
      <h1 className="mb-1 text-2xl font-semibold text-brand-primary">Panel administrativo</h1>
      <p className="mb-8 text-sm text-gray-500">
        {profile?.fullName ?? "Bienvenido"} - Rol: {profile?.role}
      </p>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        {PANEL_ITEMS.map((item) => (
          <Link
            key={item.to}
            to={item.to}
            className="flex items-center justify-center rounded-lg border border-gray-200 bg-white p-8 text-center text-base font-medium text-brand-primary shadow-sm hover:border-brand-primary hover:shadow-md"
          >
            {item.label}
          </Link>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Agregar "Clientes" y "Alumnos" a la nav de `AdminLayout`**

```tsx
// apps/admin/src/layouts/AdminLayout.tsx
// NAV_ITEMS queda:
const NAV_ITEMS = [
  { to: "/", label: "Inicio" },
  { to: "/instructors", label: "Instructores" },
  { to: "/classes", label: "Clases" },
  { to: "/packages", label: "Paquetes" },
  { to: "/customers", label: "Clientes" },
  { to: "/students", label: "Alumnos" },
];
```

- [ ] **Step 3: Typecheck, lint, build**

Run: `cd apps/admin && npm run typecheck && npm run lint && npm run build`
Expected: sin errores.

- [ ] **Step 4: Verificación end-to-end completa en navegador (checklist del spec)**

Con `npm run dev:admin` corriendo y sesion iniciada como `SUPER_ADMIN`:

1. `/` muestra los 5 botones grandes (Instructores, Clases, Paquetes, Clientes, Alumnos), cada uno navega a su ruta.
2. Nav de `AdminLayout` incluye "Clientes" y "Alumnos", resaltado activo funciona.
3. `/customers` lista los perfiles con rol `CUSTOMER` existentes (nombre, telefono).
4. Click en "Ver" de un cliente entra a `/customers/:id`.
5. En el detalle: editar nombre/telefono del cliente y guardar se refleja.
6. "Nuevo alumno" abre el modal, crear un alumno (con y sin fecha de nacimiento) aparece en la tabla de ese cliente.
7. Editar el alumno (cambiar nombre) se refleja.
8. Desactivar el alumno lo deja como inactivo en la tabla; reactivar funciona; ambos con `confirm()` solo al desactivar.
9. `/students` muestra ese alumno con la columna "Tutor" mostrando el nombre correcto del cliente.
10. Tecla Escape cierra el modal de alumno.

- [ ] **Step 5: Actualizar `docs/CURRENT_STATE.md`**

Agrega una sección "CRUD de Clientes y Alumnos en `apps/admin`" (mismo formato que las de Instructores/Clases/Paquetes ya existentes) describiendo lo implementado: directorio de clientes sobre `profiles`, CRUD de alumnos (tabla `dependents`, migracion `010`), vista global de alumnos, panel de inicio con botones grandes. Actualiza "In Progress"/"Next Task" para reflejar que este sub-proyecto esta completo y pendiente de PR/merge, y que el siguiente sub-proyecto acordado es **Reservaciones + Lista de Espera**.

- [ ] **Step 6: Commit**

```bash
git add apps/admin/src/pages/HomePage.tsx apps/admin/src/layouts/AdminLayout.tsx docs/CURRENT_STATE.md
git commit -m "feat(admin): panel de inicio con botones grandes; nav y docs al dia"
```
