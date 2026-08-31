# Academia — Grupos + Inscripciones en `apps/admin` Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** CRUD de grupos de Academia (nombre, instructor opcional, horario semanal) e inscribir/dar de baja Alumnos existentes a un grupo, todo desde `apps/admin`.

**Architecture:** Feature-First (`apps/admin/src/features/academy/`), mismo patrón `Page → componente → hook → service → Supabase` que el resto del panel. Sin funciones RPC: a diferencia de Reservaciones, aquí no hay ninguna invariante sensible a condición de carrera (sin cupo máximo en este sub-proyecto) — escritura vía RLS normal, mismo patrón que Instructores/Alumnos/Paquetes.

**Tech Stack:** React + Vite + TypeScript strict, Tailwind CSS v4, Supabase (Postgres + RLS + supabase-js tipado), Zod, React Router v6.

**Spec:** `docs/superpowers/specs/2026-08-31-academy-groups-enrollments-design.md`

## Global Constraints

- El Alumno (`dependents`) debe pertenecer a un Cliente (`profiles`) que ya tiene cuenta — no se crean clientes nuevos en este sub-proyecto (ver "No incluye" en el spec).
- Sin cupo máximo por grupo, sin motivo de baja (solo cambio de `status`), sin vista de cliente en `apps/web`.
- Manejo de errores: usa `apps/admin/src/utils/getErrorMessage.ts` (ya existente) en todos los componentes nuevos — **nunca** el patrón `mapSaveError`/`err instanceof Error` de los formularios más viejos, que tiene un bug conocido (`err instanceof Error` nunca es `true` para un error real de Supabase — ver `docs/roadmap.md`, sección "Deuda técnica conocida").
- `"exactOptionalPropertyTypes": true` en `tsconfig.base.json` — cualquier payload con campos opcionales se tipa de forma estructural y se asigna condicionalmente, nunca `Record<string, ...> as any`.
- Todo `<form>` usa `noValidate`. Modales cierran con tecla Escape (patrón ya establecido en Instructores/Clases/Paquetes/Alumnos/Reservaciones).
- El proyecto no tiene test runner en `apps/admin` — verificación es `npm run typecheck` / `npm run lint` / `npm run build` por tarea, más verificación manual end-to-end en navegador real en la tarea final.
- No se re-crea un archivo completo si solo hace falta cambiar una parte — al modificar `App.tsx`/`AdminLayout.tsx`/`HomePage.tsx`, lee el archivo primero y agrega solo lo que se pide.

---

### Task 1: Migración de grupos/horarios/inscripciones + regenerar tipos

**Files:**
- Create: `supabase/migrations/012_academy_groups.sql`
- Modify: `apps/admin/src/lib/database.types.ts` (regenerado completo)
- Modify: `apps/web/src/lib/database.types.ts` (regenerado completo, mismo patrón ya usado en migraciones anteriores)

**Interfaces:**
- Produces: tablas `public.academy_groups`, `public.academy_group_schedules`, `public.academy_enrollments` — disponibles para las tareas siguientes vía el cliente Supabase tipado.

- [ ] **Step 1: Crear el archivo de migración**

```sql
-- supabase/migrations/012_academy_groups.sql
-- Grupos de Academia, su horario semanal, e inscripciones de Alumnos
-- (dependents) a esos grupos. Sin funciones RPC: a diferencia de
-- bookings, no hay invariante sensible a condicion de carrera (sin cupo
-- maximo todavia) -- ver
-- docs/superpowers/specs/2026-08-31-academy-groups-enrollments-design.md.

create table public.academy_groups (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.business (id),
  name text not null,
  instructor_id uuid references public.instructors (id),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.academy_group_schedules (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.business (id),
  group_id uuid not null references public.academy_groups (id) on delete cascade,
  day_of_week smallint not null check (day_of_week between 0 and 6), -- 0 = domingo
  start_time time not null,
  end_time time not null,
  constraint academy_group_schedules_time_order check (end_time > start_time)
);
-- business_id esta denormalizado del grupo padre a proposito -- CLAUDE.md
-- exige business_id en toda tabla de negocio, y evita una subquery/join
-- en cada policy de RLS. El service siempre lo escribe igual al de
-- academy_groups.
create index academy_group_schedules_group_id_idx
  on public.academy_group_schedules (group_id);

create table public.academy_enrollments (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.business (id),
  dependent_id uuid not null references public.dependents (id),
  group_id uuid not null references public.academy_groups (id),
  enrollment_date date not null default current_date,
  status text not null default 'ACTIVA' check (status in ('ACTIVA', 'BAJA')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
-- Un mismo Alumno no puede tener dos inscripciones ACTIVAS al mismo
-- grupo (si se da de baja y se re-inscribe despues, es una fila nueva).
create unique index academy_enrollments_active_unique
  on public.academy_enrollments (dependent_id, group_id)
  where status = 'ACTIVA';
create index academy_enrollments_group_id_idx
  on public.academy_enrollments (group_id);
create index academy_enrollments_dependent_id_idx
  on public.academy_enrollments (dependent_id);

alter table public.academy_groups enable row level security;
create policy "academy_groups_manage_staff"
  on public.academy_groups for all
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

alter table public.academy_group_schedules enable row level security;
create policy "academy_group_schedules_manage_staff"
  on public.academy_group_schedules for all
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

alter table public.academy_enrollments enable row level security;
create policy "academy_enrollments_manage_staff"
  on public.academy_enrollments for all
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
```

- [ ] **Step 2: Aplicar la migración al proyecto de Supabase de desarrollo**

Usa la tool `mcp__claude_ai_Supabase__apply_migration` con `project_id: "eazyblybekyygimqpjjw"`, `name: "012_academy_groups"`, y `query` = el contenido exacto del archivo del Step 1. Si no está disponible, aplica el SQL manualmente desde el SQL Editor del dashboard de Supabase del proyecto `eazyblybekyygimqpjjw`.

Expected: sin errores. Confirma con `mcp__claude_ai_Supabase__list_tables` que `academy_groups`, `academy_group_schedules` y `academy_enrollments` existen.

- [ ] **Step 3: Regenerar los tipos TypeScript en ambas apps**

Usa `mcp__claude_ai_Supabase__generate_typescript_types` con `project_id: "eazyblybekyygimqpjjw"`. Guarda el resultado completo (sobrescribiendo el archivo entero) en `apps/admin/src/lib/database.types.ts` y `apps/web/src/lib/database.types.ts`. Si la tool no está disponible, usa `supabase gen types typescript --project-id eazyblybekyygimqpjjw` y guarda la salida en ambos archivos.

- [ ] **Step 4: Verificar advisors de seguridad**

Corre `mcp__claude_ai_Supabase__get_advisors` con `project_id: "eazyblybekyygimqpjjw"` y `type: "security"`. Confirma que no aparece ninguna advertencia nueva sobre `academy_groups`, `academy_group_schedules` o `academy_enrollments` (ej. RLS deshabilitado). Estas tablas no tienen funciones `security definer` (sin RPCs en este sub-proyecto), así que no aplica el chequeo de `search_path` fijo. Si aparece algo, corrígelo en el mismo archivo de migración (todavía no está commiteada) y re-aplica.

- [ ] **Step 5: Verificar que ambas apps siguen compilando**

Run: `cd apps/admin && npm run typecheck && cd ../web && npm run typecheck`
Expected: sin errores en ninguna de las dos apps.

- [ ] **Step 6: Commit**

```bash
git add supabase/migrations/012_academy_groups.sql apps/admin/src/lib/database.types.ts apps/web/src/lib/database.types.ts
git commit -m "feat(db): tablas de grupos/horarios/inscripciones de academia"
```

---

### Task 2: Academia — tipos y services

**Files:**
- Create: `apps/admin/src/features/academy/types/AcademyGroup.ts`
- Create: `apps/admin/src/features/academy/types/AcademyEnrollment.ts`
- Create: `apps/admin/src/features/academy/services/academyGroupsService.ts`
- Create: `apps/admin/src/features/academy/services/academyEnrollmentsService.ts`

**Interfaces:**
- Consumes: tablas de Task 1.
- Produces: `type AcademyGroup`, `type AcademyGroupSchedule`, `type AcademyGroupWithDetails`, `type GroupScheduleInput`, `type GroupInput`.
- Produces: `type AcademyEnrollment`, `type AcademyEnrollmentWithStudent`.
- Produces: `listGroups(): Promise<AcademyGroupWithDetails[]>`
- Produces: `createGroup(businessId: string, input: GroupInput): Promise<AcademyGroup>`
- Produces: `updateGroup(id: string, businessId: string, input: GroupInput): Promise<AcademyGroup>`
- Produces: `listEnrollmentsByGroup(groupId: string): Promise<AcademyEnrollmentWithStudent[]>` (solo `ACTIVA`)
- Produces: `enrollStudent(businessId: string, dependentId: string, groupId: string, enrollmentDate: string): Promise<AcademyEnrollment>`
- Produces: `withdrawEnrollment(id: string): Promise<void>`

- [ ] **Step 1: Crear `types/AcademyGroup.ts`**

```typescript
// apps/admin/src/features/academy/types/AcademyGroup.ts

/**
 * Forma en camelCase de una fila de `academy_groups` (ver
 * supabase/migrations/012_academy_groups.sql). El mapeo snake_case ->
 * camelCase vive en features/academy/services/academyGroupsService.ts.
 */
export type AcademyGroup = {
  id: string;
  businessId: string;
  name: string;
  instructorId: string | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
};

/** Forma en camelCase de una fila de `academy_group_schedules`. */
export type AcademyGroupSchedule = {
  id: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
};

/** Usado en la tabla de grupos, con instructor/horario/conteo de inscritos. */
export type AcademyGroupWithDetails = AcademyGroup & {
  instructorName: string | null;
  schedules: AcademyGroupSchedule[];
  enrolledCount: number;
};

/** Un horario dentro del formulario de grupo, antes de tener `id`. */
export type GroupScheduleInput = { dayOfWeek: number; startTime: string; endTime: string };

/** Payload de crear/editar un grupo (reemplaza todos sus horarios). */
export type GroupInput = {
  name: string;
  instructorId?: string | null;
  schedules: GroupScheduleInput[];
};
```

- [ ] **Step 2: Crear `types/AcademyEnrollment.ts`**

```typescript
// apps/admin/src/features/academy/types/AcademyEnrollment.ts

/**
 * Forma en camelCase de una fila de `academy_enrollments` (ver
 * supabase/migrations/012_academy_groups.sql).
 */
export type AcademyEnrollment = {
  id: string;
  businessId: string;
  dependentId: string;
  groupId: string;
  enrollmentDate: string;
  status: "ACTIVA" | "BAJA";
  createdAt: string;
  updatedAt: string;
};

/** Usado en la tabla de inscritos de un grupo, con nombre de alumno/tutor. */
export type AcademyEnrollmentWithStudent = AcademyEnrollment & {
  studentName: string;
  guardianName: string | null;
};
```

- [ ] **Step 3: Crear `services/academyGroupsService.ts`**

```typescript
// apps/admin/src/features/academy/services/academyGroupsService.ts
import { supabase } from "@/lib/supabaseClient";
import type {
  AcademyGroup,
  AcademyGroupSchedule,
  AcademyGroupWithDetails,
  GroupInput,
} from "../types/AcademyGroup";

const GROUP_COLUMNS = "id, business_id, name, instructor_id, active, created_at, updated_at";
const SCHEDULE_COLUMNS = "id, day_of_week, start_time, end_time";

type GroupRow = {
  id: string;
  business_id: string;
  name: string;
  instructor_id: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
};

type ScheduleRow = {
  id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
};

function toGroup(row: GroupRow): AcademyGroup {
  return {
    id: row.id,
    businessId: row.business_id,
    name: row.name,
    instructorId: row.instructor_id,
    active: row.active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toSchedule(row: ScheduleRow): AcademyGroupSchedule {
  return {
    id: row.id,
    dayOfWeek: row.day_of_week,
    startTime: row.start_time,
    endTime: row.end_time,
  };
}

type GroupWithDetailsRow = GroupRow & {
  instructors: { full_name: string } | null;
  academy_group_schedules: ScheduleRow[];
};

export async function listGroups(): Promise<AcademyGroupWithDetails[]> {
  const { data, error } = await supabase
    .from("academy_groups")
    .select(`${GROUP_COLUMNS}, instructors(full_name), academy_group_schedules(${SCHEDULE_COLUMNS})`)
    .order("name", { ascending: true });

  if (error) throw error;

  const { data: activeEnrollments, error: enrollmentsError } = await supabase
    .from("academy_enrollments")
    .select("group_id")
    .eq("status", "ACTIVA");

  if (enrollmentsError) throw enrollmentsError;

  const countsByGroup = new Map<string, number>();
  for (const row of activeEnrollments) {
    countsByGroup.set(row.group_id, (countsByGroup.get(row.group_id) ?? 0) + 1);
  }

  return (data as GroupWithDetailsRow[]).map((row) => ({
    ...toGroup(row),
    instructorName: row.instructors?.full_name ?? null,
    schedules: row.academy_group_schedules.map(toSchedule),
    enrolledCount: countsByGroup.get(row.id) ?? 0,
  }));
}

export async function createGroup(businessId: string, input: GroupInput): Promise<AcademyGroup> {
  const { data, error } = await supabase
    .from("academy_groups")
    .insert({
      business_id: businessId,
      name: input.name,
      instructor_id: input.instructorId ?? null,
    })
    .select(GROUP_COLUMNS)
    .single();

  if (error) throw error;

  if (input.schedules.length > 0) {
    const { error: schedulesError } = await supabase.from("academy_group_schedules").insert(
      input.schedules.map((schedule) => ({
        business_id: businessId,
        group_id: data.id,
        day_of_week: schedule.dayOfWeek,
        start_time: schedule.startTime,
        end_time: schedule.endTime,
      })),
    );
    if (schedulesError) throw schedulesError;
  }

  return toGroup(data);
}

export async function updateGroup(
  id: string,
  businessId: string,
  input: GroupInput,
): Promise<AcademyGroup> {
  const { data, error } = await supabase
    .from("academy_groups")
    .update({
      name: input.name,
      instructor_id: input.instructorId ?? null,
    })
    .eq("id", id)
    .select(GROUP_COLUMNS)
    .single();

  if (error) throw error;

  const { error: deleteError } = await supabase
    .from("academy_group_schedules")
    .delete()
    .eq("group_id", id);
  if (deleteError) throw deleteError;

  if (input.schedules.length > 0) {
    const { error: schedulesError } = await supabase.from("academy_group_schedules").insert(
      input.schedules.map((schedule) => ({
        business_id: businessId,
        group_id: id,
        day_of_week: schedule.dayOfWeek,
        start_time: schedule.startTime,
        end_time: schedule.endTime,
      })),
    );
    if (schedulesError) throw schedulesError;
  }

  return toGroup(data);
}
```

Nota: `updateGroup` reemplaza todos los horarios del grupo (borra + inserta) en vez de hacer diff — son pocas filas por grupo, más simple que reconciliar altas/bajas/ediciones individuales.

- [ ] **Step 4: Crear `services/academyEnrollmentsService.ts`**

```typescript
// apps/admin/src/features/academy/services/academyEnrollmentsService.ts
import { supabase } from "@/lib/supabaseClient";
import type { AcademyEnrollment, AcademyEnrollmentWithStudent } from "../types/AcademyEnrollment";

const ENROLLMENT_COLUMNS =
  "id, business_id, dependent_id, group_id, enrollment_date, status, created_at, updated_at";

type EnrollmentRow = {
  id: string;
  business_id: string;
  dependent_id: string;
  group_id: string;
  enrollment_date: string;
  status: AcademyEnrollment["status"];
  created_at: string;
  updated_at: string;
};

function toEnrollment(row: EnrollmentRow): AcademyEnrollment {
  return {
    id: row.id,
    businessId: row.business_id,
    dependentId: row.dependent_id,
    groupId: row.group_id,
    enrollmentDate: row.enrollment_date,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

type EnrollmentWithStudentRow = EnrollmentRow & {
  dependents: { full_name: string; profiles: { full_name: string | null } | null } | null;
};

export async function listEnrollmentsByGroup(groupId: string): Promise<AcademyEnrollmentWithStudent[]> {
  const { data, error } = await supabase
    .from("academy_enrollments")
    .select(`${ENROLLMENT_COLUMNS}, dependents(full_name, profiles(full_name))`)
    .eq("group_id", groupId)
    .eq("status", "ACTIVA")
    .order("enrollment_date", { ascending: true });

  if (error) throw error;
  return (data as EnrollmentWithStudentRow[]).map((row) => ({
    ...toEnrollment(row),
    studentName: row.dependents?.full_name ?? "-",
    guardianName: row.dependents?.profiles?.full_name ?? null,
  }));
}

export async function enrollStudent(
  businessId: string,
  dependentId: string,
  groupId: string,
  enrollmentDate: string,
): Promise<AcademyEnrollment> {
  const { data, error } = await supabase
    .from("academy_enrollments")
    .insert({
      business_id: businessId,
      dependent_id: dependentId,
      group_id: groupId,
      enrollment_date: enrollmentDate,
    })
    .select(ENROLLMENT_COLUMNS)
    .single();

  if (error) throw error;
  return toEnrollment(data);
}

export async function withdrawEnrollment(id: string): Promise<void> {
  const { error } = await supabase
    .from("academy_enrollments")
    .update({ status: "BAJA", updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) throw error;
}
```

- [ ] **Step 5: Typecheck**

Run: `cd apps/admin && npm run typecheck`
Expected: sin errores.

Puntos donde el compilador puede pedir un ajuste distinto al código de arriba (ya visto antes en este proyecto, mismo tipo de situación — ver `apps/admin/src/features/bookings/services/bookingsService.ts` como referencia de cómo se resolvió la última vez):
- La forma exacta de los embeds `instructors(...)`, `academy_group_schedules(...)`, `dependents(...)` y `profiles(...)` anidado (objeto único vs arreglo) depende de cómo `database.types.ts` haya inferido esas relaciones — ajusta el tipo y el acceso según lo que `tsc` exija.

Si necesitas ajustar cualquiera de los dos, documenta qué cambiaste y por qué en tu reporte.

- [ ] **Step 6: Commit**

```bash
git add apps/admin/src/features/academy/types apps/admin/src/features/academy/services
git commit -m "feat(admin): capa de datos de grupos e inscripciones de academia"
```

---

### Task 3: Grupos de Academia — hook, formulario, página y navegación

**Files:**
- Create: `apps/admin/src/features/academy/hooks/useAcademyGroups.ts`
- Create: `apps/admin/src/features/academy/components/AcademyGroupFormModal.tsx`
- Create: `apps/admin/src/pages/AcademyGroupsPage.tsx`
- Modify: `apps/admin/src/layouts/AdminLayout.tsx` (link "Academia")
- Modify: `apps/admin/src/pages/HomePage.tsx` (botón "Academia" en el grid)
- Modify: `apps/admin/src/App.tsx` (ruta `/academy/groups`)

**Interfaces:**
- Consumes: todo lo de Task 2. `useInstructors()` (`apps/admin/src/features/instructors/hooks/useInstructors.ts`, ya existente) para poblar el selector de instructor — reusado tal cual, no se crea un hook nuevo.
- Produces: hook `useAcademyGroups()` → `{ groups: AcademyGroupWithDetails[]; loading: boolean; error: string | null; reload: () => Promise<void>; create: (input: GroupInput) => Promise<void>; update: (id: string, input: GroupInput) => Promise<void> }`.
- Produces: ruta `/academy/groups`, protegida con `RequireAuth` + `AdminLayout`.

- [ ] **Step 1: Crear `hooks/useAcademyGroups.ts`**

```typescript
// apps/admin/src/features/academy/hooks/useAcademyGroups.ts
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/features/auth/hooks/AuthProvider";
import { createGroup, listGroups, updateGroup } from "../services/academyGroupsService";
import type { AcademyGroupWithDetails, GroupInput } from "../types/AcademyGroup";

export function useAcademyGroups() {
  const { profile } = useAuth();
  const [groups, setGroups] = useState<AcademyGroupWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setGroups(await listGroups());
    } catch (err) {
      setError("No se pudieron cargar los grupos.");
      console.error("[academy] listGroups fallo", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  async function create(input: GroupInput) {
    if (!profile) throw new Error("Falta el perfil del usuario actual.");
    await createGroup(profile.businessId, input);
    await reload();
  }

  async function update(id: string, input: GroupInput) {
    if (!profile) throw new Error("Falta el perfil del usuario actual.");
    await updateGroup(id, profile.businessId, input);
    await reload();
  }

  return { groups, loading, error, reload, create, update };
}
```

- [ ] **Step 2: Crear `components/AcademyGroupFormModal.tsx`**

```tsx
// apps/admin/src/features/academy/components/AcademyGroupFormModal.tsx
import { useEffect, useState, type FormEvent } from "react";
import { z } from "zod";
import type { Instructor } from "@/features/instructors/types/Instructor";
import { getErrorMessage } from "@/utils/getErrorMessage";
import type { AcademyGroupWithDetails, GroupInput, GroupScheduleInput } from "../types/AcademyGroup";

const DAY_LABELS = ["Domingo", "Lunes", "Martes", "Miercoles", "Jueves", "Viernes", "Sabado"];

const scheduleSchema = z
  .object({
    dayOfWeek: z.coerce.number().int().min(0).max(6),
    startTime: z.string().min(1, "Hora de inicio obligatoria"),
    endTime: z.string().min(1, "Hora de fin obligatoria"),
  })
  .refine((value) => value.endTime > value.startTime, {
    message: "La hora de fin debe ser despues de la hora de inicio",
    path: ["endTime"],
  });

const schema = z.object({
  name: z.string().min(1, "El nombre es obligatorio"),
  instructorId: z.string(),
  schedules: z.array(scheduleSchema),
});

type Props = {
  open: boolean;
  initialValue: AcademyGroupWithDetails | null;
  instructors: Instructor[];
  onClose: () => void;
  onSubmit: (input: GroupInput) => Promise<void>;
};

export function AcademyGroupFormModal({ open, initialValue, instructors, onClose, onSubmit }: Props) {
  const [name, setName] = useState("");
  const [instructorId, setInstructorId] = useState("");
  const [schedules, setSchedules] = useState<GroupScheduleInput[]>([]);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName(initialValue?.name ?? "");
    setInstructorId(initialValue?.instructorId ?? "");
    setSchedules(
      initialValue
        ? initialValue.schedules.map((s) => ({
            dayOfWeek: s.dayOfWeek,
            startTime: s.startTime.slice(0, 5),
            endTime: s.endTime.slice(0, 5),
          }))
        : [],
    );
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

  function addSchedule() {
    setSchedules((prev) => [...prev, { dayOfWeek: 1, startTime: "", endTime: "" }]);
  }

  function removeSchedule(index: number) {
    setSchedules((prev) => prev.filter((_, i) => i !== index));
  }

  function updateSchedule(index: number, patch: Partial<GroupScheduleInput>) {
    setSchedules((prev) => prev.map((s, i) => (i === index ? { ...s, ...patch } : s)));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);

    const result = schema.safeParse({ name, instructorId, schedules });
    if (!result.success) {
      const errors: Record<string, string> = {};
      for (const issue of result.error.issues) {
        errors[issue.path.join(".")] = issue.message;
      }
      setFieldErrors(errors);
      return;
    }
    setFieldErrors({});

    setIsSaving(true);
    try {
      await onSubmit({
        name: result.data.name,
        instructorId: result.data.instructorId ? result.data.instructorId : null,
        schedules: result.data.schedules,
      });
      onClose();
    } catch (err) {
      setFormError(getErrorMessage(err, "No se pudo guardar el grupo."));
      console.error("[academy] guardar grupo fallo", err);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/40 p-4">
      <form
        id="academy-group-form-modal"
        onSubmit={handleSubmit}
        noValidate
        className="flex w-full max-w-lg flex-col gap-3 rounded-lg bg-white p-6"
      >
        <h2 className="text-lg font-semibold text-brand-primary">
          {initialValue ? "Editar grupo" : "Nuevo grupo"}
        </h2>

        <div className="flex flex-col gap-1">
          <input
            id="academy-group-name-input"
            type="text"
            placeholder="Nombre del grupo"
            value={name}
            onChange={(event) => setName(event.target.value)}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
          {fieldErrors.name && <p className="text-xs text-red-600">{fieldErrors.name}</p>}
        </div>

        <select
          id="academy-group-instructor-select"
          value={instructorId}
          onChange={(event) => setInstructorId(event.target.value)}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm"
        >
          <option value="">Sin instructor asignado</option>
          {instructors.map((instructor) => (
            <option key={instructor.id} value={instructor.id}>
              {instructor.fullName}
            </option>
          ))}
        </select>

        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500">Horario semanal</span>
            <button
              type="button"
              onClick={addSchedule}
              className="text-xs text-brand-primary hover:underline"
            >
              Agregar horario
            </button>
          </div>
          {schedules.map((schedule, index) => (
            <div key={index} className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <select
                  value={schedule.dayOfWeek}
                  onChange={(event) => updateSchedule(index, { dayOfWeek: Number(event.target.value) })}
                  className="rounded-md border border-gray-300 px-2 py-1 text-sm"
                >
                  {DAY_LABELS.map((label, dayIndex) => (
                    <option key={dayIndex} value={dayIndex}>
                      {label}
                    </option>
                  ))}
                </select>
                <input
                  type="time"
                  value={schedule.startTime}
                  onChange={(event) => updateSchedule(index, { startTime: event.target.value })}
                  className="rounded-md border border-gray-300 px-2 py-1 text-sm"
                />
                <span className="text-xs text-gray-500">a</span>
                <input
                  type="time"
                  value={schedule.endTime}
                  onChange={(event) => updateSchedule(index, { endTime: event.target.value })}
                  className="rounded-md border border-gray-300 px-2 py-1 text-sm"
                />
                <button
                  type="button"
                  onClick={() => removeSchedule(index)}
                  className="text-xs text-gray-500 hover:underline"
                >
                  Quitar
                </button>
              </div>
              {fieldErrors[`schedules.${index}.endTime`] && (
                <p className="text-xs text-red-600">{fieldErrors[`schedules.${index}.endTime`]}</p>
              )}
            </div>
          ))}
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

- [ ] **Step 3: Crear `pages/AcademyGroupsPage.tsx`**

```tsx
// apps/admin/src/pages/AcademyGroupsPage.tsx
import { useState } from "react";
import { Link } from "react-router-dom";
import { AcademyGroupFormModal } from "@/features/academy/components/AcademyGroupFormModal";
import { useAcademyGroups } from "@/features/academy/hooks/useAcademyGroups";
import type { AcademyGroupWithDetails, GroupInput } from "@/features/academy/types/AcademyGroup";
import { useInstructors } from "@/features/instructors/hooks/useInstructors";

const DAY_ABBREVIATIONS = ["Dom", "Lun", "Mar", "Mie", "Jue", "Vie", "Sab"];

function formatSchedule(group: AcademyGroupWithDetails): string {
  if (group.schedules.length === 0) return "Sin horario";
  return group.schedules
    .map((s) => `${DAY_ABBREVIATIONS[s.dayOfWeek]} ${s.startTime.slice(0, 5)}-${s.endTime.slice(0, 5)}`)
    .join(", ");
}

export function AcademyGroupsPage() {
  const { groups, loading, error, create, update } = useAcademyGroups();
  const { instructors } = useInstructors();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<AcademyGroupWithDetails | null>(null);

  function openCreate() {
    setEditingGroup(null);
    setModalOpen(true);
  }

  function openEdit(group: AcademyGroupWithDetails) {
    setEditingGroup(group);
    setModalOpen(true);
  }

  async function handleSubmit(input: GroupInput) {
    if (editingGroup) {
      await update(editingGroup.id, input);
    } else {
      await create(input);
    }
  }

  return (
    <div id="academy-groups-page" className="mx-auto max-w-4xl p-6">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-brand-primary">Academia</h1>
        <button
          type="button"
          onClick={openCreate}
          className="rounded-md bg-brand-primary px-4 py-2 text-sm font-medium text-white hover:opacity-90"
        >
          Nuevo grupo
        </button>
      </div>

      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}
      {loading && <p className="text-sm text-gray-500">Cargando...</p>}
      {!loading && groups.length === 0 && (
        <p className="text-sm text-gray-500">Todavia no hay grupos.</p>
      )}
      {!loading && groups.length > 0 && (
        <table id="academy-groups-table" className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-gray-200 text-left text-gray-500">
              <th className="py-2">Nombre</th>
              <th className="py-2">Instructor</th>
              <th className="py-2">Horario</th>
              <th className="py-2">Inscritos</th>
              <th className="py-2">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {groups.map((group) => (
              <tr key={group.id} className="border-b border-gray-100">
                <td className="py-2">{group.name}</td>
                <td className="py-2">{group.instructorName ?? "-"}</td>
                <td className="py-2">{formatSchedule(group)}</td>
                <td className="py-2">{group.enrolledCount}</td>
                <td className="py-2">
                  <Link
                    to={`/academy/groups/${group.id}`}
                    className="mr-3 text-brand-primary hover:underline"
                  >
                    Ver alumnos
                  </Link>
                  <button
                    type="button"
                    onClick={() => openEdit(group)}
                    className="text-brand-primary hover:underline"
                  >
                    Editar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <AcademyGroupFormModal
        open={modalOpen}
        initialValue={editingGroup}
        instructors={instructors}
        onClose={() => setModalOpen(false)}
        onSubmit={handleSubmit}
      />
    </div>
  );
}
```

- [ ] **Step 4: Agregar el link "Academia" en `AdminLayout.tsx`**

Lee el archivo actual antes de editarlo. Agrega una entrada al final del arreglo `NAV_ITEMS`:

```tsx
  { to: "/academy/groups", label: "Academia" },
```

- [ ] **Step 5: Agregar el botón "Academia" en `HomePage.tsx`**

Lee el archivo actual antes de editarlo. Agrega una entrada al final del arreglo `PANEL_ITEMS`:

```tsx
  { to: "/academy/groups", label: "Academia" },
```

- [ ] **Step 6: Registrar la ruta en `App.tsx`**

Lee el archivo actual antes de editarlo.

```tsx
// Agregar el import junto a los demas:
import { AcademyGroupsPage } from "@/pages/AcademyGroupsPage";

// Agregar dentro de <Routes>, junto a las rutas existentes:
          <Route
            path="/academy/groups"
            element={
              <RequireAuth>
                <AdminLayout>
                  <AcademyGroupsPage />
                </AdminLayout>
              </RequireAuth>
            }
          />
```

- [ ] **Step 7: Typecheck, lint, build**

Run: `cd apps/admin && npm run typecheck && npm run lint && npm run build`
Expected: sin errores.

- [ ] **Step 8: Commit**

```bash
git add apps/admin/src/features/academy apps/admin/src/pages/AcademyGroupsPage.tsx apps/admin/src/layouts/AdminLayout.tsx apps/admin/src/pages/HomePage.tsx apps/admin/src/App.tsx
git commit -m "feat(admin): pagina de grupos de academia con navegacion"
```

---

### Task 4: Inscripciones — detalle del grupo, inscribir/dar de baja

**Files:**
- Create: `apps/admin/src/features/academy/hooks/useAcademyGroupEnrollments.ts`
- Create: `apps/admin/src/features/academy/components/EnrollStudentModal.tsx`
- Create: `apps/admin/src/pages/AcademyGroupDetailPage.tsx`
- Modify: `apps/admin/src/App.tsx` (ruta `/academy/groups/:id`)

**Interfaces:**
- Consumes: todo lo de Task 2 y Task 3. `useAcademyGroups()` (Task 3, ya existente) para obtener el grupo por id — NO se crea un `getGroup(id)` nuevo en `academyGroupsService.ts`, se reusa la lista ya cargada (mismo patrón que `ClassBookingsPage` con `useClasses()`). `useCustomers()` (`apps/admin/src/features/customers/hooks/useCustomers.ts`, ya existente) para poblar el selector de clientes. `useDependentsByGuardian(guardianId, businessId)` (`apps/admin/src/features/dependents/hooks/useDependents.ts`, ya existente) para poblar/crear Alumnos del cliente elegido.
- Produces: hook `useAcademyGroupEnrollments(groupId: string, businessId: string)` → `{ enrollments: AcademyEnrollmentWithStudent[]; loading: boolean; error: string | null; reload: () => Promise<void>; enroll: (dependentId: string, enrollmentDate: string) => Promise<void>; withdraw: (id: string) => Promise<void> }`.
- Produces: ruta `/academy/groups/:id`, protegida con `RequireAuth` + `AdminLayout`.

- [ ] **Step 1: Crear `hooks/useAcademyGroupEnrollments.ts`**

```typescript
// apps/admin/src/features/academy/hooks/useAcademyGroupEnrollments.ts
import { useCallback, useEffect, useState } from "react";
import {
  enrollStudent,
  listEnrollmentsByGroup,
  withdrawEnrollment,
} from "../services/academyEnrollmentsService";
import type { AcademyEnrollmentWithStudent } from "../types/AcademyEnrollment";

export function useAcademyGroupEnrollments(groupId: string, businessId: string) {
  const [enrollments, setEnrollments] = useState<AcademyEnrollmentWithStudent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setEnrollments(await listEnrollmentsByGroup(groupId));
    } catch (err) {
      setError("No se pudieron cargar los alumnos inscritos.");
      console.error("[academy] listEnrollmentsByGroup fallo", err);
    } finally {
      setLoading(false);
    }
  }, [groupId]);

  useEffect(() => {
    reload();
  }, [reload]);

  async function enroll(dependentId: string, enrollmentDate: string) {
    if (!businessId) throw new Error("Falta el business_id del grupo.");
    await enrollStudent(businessId, dependentId, groupId, enrollmentDate);
    await reload();
  }

  async function withdraw(id: string) {
    await withdrawEnrollment(id);
    await reload();
  }

  return { enrollments, loading, error, reload, enroll, withdraw };
}
```

- [ ] **Step 2: Crear `components/EnrollStudentModal.tsx`**

```tsx
// apps/admin/src/features/academy/components/EnrollStudentModal.tsx
import { useEffect, useState, type FormEvent } from "react";
import { z } from "zod";
import type { Customer } from "@/features/customers/types/Customer";
import { useDependentsByGuardian } from "@/features/dependents/hooks/useDependents";
import { getErrorMessage } from "@/utils/getErrorMessage";

const newStudentSchema = z.object({
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

type Props = {
  open: boolean;
  customers: Customer[];
  onClose: () => void;
  onSubmit: (dependentId: string, enrollmentDate: string) => Promise<void>;
};

// Este modal NO es un solo <form>: es un mini-flujo (elegir cliente ->
// elegir o crear alumno -> inscribir). El sub-formulario de "crear
// alumno" es su propio <form> (necesita su propio submit/Enter); el
// boton final "Inscribir" es un boton normal con onClick, no un submit
// de formulario -- evita anidar dos <form> (invalido en HTML).
export function EnrollStudentModal({ open, customers, onClose, onSubmit }: Props) {
  const [customerId, setCustomerId] = useState("");
  const [dependentId, setDependentId] = useState("");
  const [enrollmentDate, setEnrollmentDate] = useState("");
  const [showNewStudentForm, setShowNewStudentForm] = useState(false);
  const [newStudentName, setNewStudentName] = useState("");
  const [newStudentBirthDate, setNewStudentBirthDate] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const customer = customers.find((c) => c.id === customerId);
  const { dependents, create: createDependent } = useDependentsByGuardian(
    customerId,
    customer?.businessId ?? "",
  );

  useEffect(() => {
    if (!open) return;
    setCustomerId("");
    setDependentId("");
    setEnrollmentDate(new Date().toISOString().slice(0, 10));
    setShowNewStudentForm(false);
    setNewStudentName("");
    setNewStudentBirthDate("");
    setFieldErrors({});
    setFormError(null);
  }, [open]);

  useEffect(() => {
    setDependentId("");
    setShowNewStudentForm(false);
  }, [customerId]);

  useEffect(() => {
    if (!open) return;
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  async function handleCreateStudent(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);

    const result = newStudentSchema.safeParse({
      fullName: newStudentName,
      birthDate: newStudentBirthDate,
    });
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
      await createDependent({
        fullName: result.data.fullName,
        birthDate: result.data.birthDate ? result.data.birthDate : null,
      });
      setShowNewStudentForm(false);
      setNewStudentName("");
      setNewStudentBirthDate("");
    } catch (err) {
      setFormError(getErrorMessage(err, "No se pudo crear el alumno."));
      console.error("[academy] crear alumno fallo", err);
    } finally {
      setIsSaving(false);
    }
  }

  async function handleSubmit() {
    setFormError(null);
    if (!dependentId) {
      setFormError("Elige un alumno");
      return;
    }

    setIsSaving(true);
    try {
      await onSubmit(dependentId, enrollmentDate);
      onClose();
    } catch (err) {
      setFormError(getErrorMessage(err, "No se pudo inscribir al alumno."));
      console.error("[academy] inscribir fallo", err);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/40 p-4">
      <div className="flex w-full max-w-sm flex-col gap-3 rounded-lg bg-white p-6">
        <h2 className="text-lg font-semibold text-brand-primary">Nuevo alumno</h2>

        <div className="flex flex-col gap-1">
          <label htmlFor="enroll-customer-select" className="text-xs text-gray-500">
            Cliente
          </label>
          <select
            id="enroll-customer-select"
            value={customerId}
            onChange={(event) => setCustomerId(event.target.value)}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm"
          >
            <option value="">Elige un cliente</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.fullName ?? c.id}
              </option>
            ))}
          </select>
        </div>

        {customerId && !showNewStudentForm && (
          <div className="flex flex-col gap-1">
            <label htmlFor="enroll-dependent-select" className="text-xs text-gray-500">
              Alumno
            </label>
            <select
              id="enroll-dependent-select"
              value={dependentId}
              onChange={(event) => setDependentId(event.target.value)}
              className="rounded-md border border-gray-300 px-3 py-2 text-sm"
            >
              <option value="">Elige un alumno</option>
              {dependents.map((dependent) => (
                <option key={dependent.id} value={dependent.id}>
                  {dependent.fullName}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => setShowNewStudentForm(true)}
              className="self-start text-xs text-brand-primary hover:underline"
            >
              Crear alumno nuevo
            </button>
          </div>
        )}

        {customerId && showNewStudentForm && (
          <form
            id="enroll-new-student-form"
            onSubmit={handleCreateStudent}
            noValidate
            className="flex flex-col gap-2 rounded-md border border-gray-200 p-3"
          >
            <div className="flex flex-col gap-1">
              <input
                id="enroll-new-student-name-input"
                type="text"
                placeholder="Nombre completo del alumno"
                value={newStudentName}
                onChange={(event) => setNewStudentName(event.target.value)}
                className="rounded-md border border-gray-300 px-3 py-2 text-sm"
              />
              {fieldErrors.fullName && <p className="text-xs text-red-600">{fieldErrors.fullName}</p>}
            </div>
            <div className="flex flex-col gap-1">
              <input
                id="enroll-new-student-birthdate-input"
                type="date"
                value={newStudentBirthDate}
                onChange={(event) => setNewStudentBirthDate(event.target.value)}
                className="rounded-md border border-gray-300 px-3 py-2 text-sm"
              />
              {fieldErrors.birthDate && (
                <p className="text-xs text-red-600">{fieldErrors.birthDate}</p>
              )}
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowNewStudentForm(false)}
                className="px-3 py-1 text-xs text-gray-600"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="rounded-md bg-brand-primary px-3 py-1 text-xs font-medium text-white hover:opacity-90 disabled:opacity-50"
              >
                {isSaving ? "Creando..." : "Crear alumno"}
              </button>
            </div>
          </form>
        )}

        <div className="flex flex-col gap-1">
          <label htmlFor="enroll-date-input" className="text-xs text-gray-500">
            Fecha de inscripcion
          </label>
          <input
            id="enroll-date-input"
            type="date"
            value={enrollmentDate}
            onChange={(event) => setEnrollmentDate(event.target.value)}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-gray-600">
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSaving || !dependentId}
            className="rounded-md bg-brand-primary px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
          >
            {isSaving ? "Inscribiendo..." : "Inscribir"}
          </button>
        </div>

        {formError && <p className="text-sm text-red-600">{formError}</p>}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Crear `pages/AcademyGroupDetailPage.tsx`**

```tsx
// apps/admin/src/pages/AcademyGroupDetailPage.tsx
import { useState } from "react";
import { useParams } from "react-router-dom";
import { EnrollStudentModal } from "@/features/academy/components/EnrollStudentModal";
import { useAcademyGroupEnrollments } from "@/features/academy/hooks/useAcademyGroupEnrollments";
import { useAcademyGroups } from "@/features/academy/hooks/useAcademyGroups";
import { useCustomers } from "@/features/customers/hooks/useCustomers";
import { getErrorMessage } from "@/utils/getErrorMessage";

const DAY_ABBREVIATIONS = ["Dom", "Lun", "Mar", "Mie", "Jue", "Vie", "Sab"];

export function AcademyGroupDetailPage() {
  const { id } = useParams<{ id: string }>();
  const groupId = id ?? "";
  const { groups, loading: groupsLoading, error: groupsError } = useAcademyGroups();
  const group = groups.find((g) => g.id === groupId);
  const { customers } = useCustomers();
  const { enrollments, loading, error, enroll, withdraw } = useAcademyGroupEnrollments(
    groupId,
    group?.businessId ?? "",
  );

  const [modalOpen, setModalOpen] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  async function handleWithdraw(enrollmentId: string) {
    if (!window.confirm("Dar de baja a este alumno del grupo?")) return;
    setActionError(null);
    try {
      await withdraw(enrollmentId);
    } catch (err) {
      setActionError(getErrorMessage(err, "No se pudo dar de baja."));
      console.error("[academy] baja fallo", err);
    }
  }

  async function handleEnroll(dependentId: string, enrollmentDate: string) {
    await enroll(dependentId, enrollmentDate);
  }

  if (groupsLoading) {
    return <div className="mx-auto max-w-3xl p-6 text-sm text-gray-500">Cargando...</div>;
  }

  if (groupsError || !group) {
    return (
      <div className="mx-auto max-w-3xl p-6 text-sm text-red-600">
        {groupsError ?? "Grupo no encontrado."}
      </div>
    );
  }

  return (
    <div id="academy-group-detail-page" className="mx-auto max-w-3xl p-6">
      <h1 className="mb-1 text-xl font-semibold text-brand-primary">{group.name}</h1>
      <p className="mb-4 text-sm text-gray-500">
        {group.instructorName ?? "Sin instructor"}
        {" · "}
        {group.schedules.length === 0
          ? "Sin horario"
          : group.schedules
              .map(
                (s) =>
                  `${DAY_ABBREVIATIONS[s.dayOfWeek]} ${s.startTime.slice(0, 5)}-${s.endTime.slice(0, 5)}`,
              )
              .join(", ")}
      </p>

      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}
      {actionError && <p className="mb-4 text-sm text-red-600">{actionError}</p>}

      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-brand-primary">Alumnos inscritos</h2>
        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className="rounded-md bg-brand-primary px-4 py-2 text-sm font-medium text-white hover:opacity-90"
        >
          Nuevo alumno
        </button>
      </div>

      {loading && <p className="text-sm text-gray-500">Cargando...</p>}
      {!loading && enrollments.length === 0 && (
        <p className="text-sm text-gray-500">Todavia no hay alumnos inscritos.</p>
      )}
      {!loading && enrollments.length > 0 && (
        <table id="academy-enrollments-table" className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-gray-200 text-left text-gray-500">
              <th className="py-2">Alumno</th>
              <th className="py-2">Tutor</th>
              <th className="py-2">Fecha de inscripcion</th>
              <th className="py-2">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {enrollments.map((enrollment) => (
              <tr key={enrollment.id} className="border-b border-gray-100">
                <td className="py-2">{enrollment.studentName}</td>
                <td className="py-2">{enrollment.guardianName ?? "-"}</td>
                <td className="py-2">{enrollment.enrollmentDate}</td>
                <td className="py-2">
                  <button
                    type="button"
                    onClick={() => handleWithdraw(enrollment.id)}
                    className="text-gray-600 hover:underline"
                  >
                    Dar de baja
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <EnrollStudentModal
        open={modalOpen}
        customers={customers}
        onClose={() => setModalOpen(false)}
        onSubmit={handleEnroll}
      />
    </div>
  );
}
```

- [ ] **Step 4: Registrar la ruta en `App.tsx`**

Lee el archivo actual antes de editarlo.

```tsx
// Agregar el import junto a los demas:
import { AcademyGroupDetailPage } from "@/pages/AcademyGroupDetailPage";

// Agregar dentro de <Routes>, junto a las rutas existentes:
          <Route
            path="/academy/groups/:id"
            element={
              <RequireAuth>
                <AdminLayout>
                  <AcademyGroupDetailPage />
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
git add apps/admin/src/features/academy apps/admin/src/pages/AcademyGroupDetailPage.tsx apps/admin/src/App.tsx
git commit -m "feat(admin): pagina de inscripciones de academia por grupo"
```

---

### Task 5: Verificación end-to-end y cierre

**Files:**
- Modify: `docs/CURRENT_STATE.md`

**Interfaces:**
- Consumes: todas las rutas y funciones de las Tasks 1-4.

- [ ] **Step 1: Verificación end-to-end completa en navegador (checklist del spec)**

Con `npm run dev:admin` corriendo y sesión iniciada como `SUPER_ADMIN`:

1. Ir a `/academy/groups` → crear un grupo con nombre, instructor, y 2 horarios (ej. Martes 17:00-18:00, Jueves 17:00-18:00) → aparece en la lista con el resumen "Mar 17:00-18:00, Jue 17:00-18:00".
2. Editar ese grupo: cambiar el instructor y quitar uno de los horarios → se refleja en la lista.
3. Ir al detalle del grupo (`/academy/groups/:id` vía "Ver alumnos") → inscribir un Alumno existente eligiendo Cliente → Alumno → aparece en la tabla con la fecha de hoy.
4. Intentar inscribir al mismo Alumno otra vez al mismo grupo → rechazado por el `unique index` (mensaje de error visible, no genérico gracias a `getErrorMessage`).
5. Desde el mismo modal, elegir un cliente, click "Crear alumno nuevo", llenar nombre (fecha de nacimiento opcional) → el Alumno nuevo queda inscrito sin salir de la página.
6. Dar de baja a un Alumno inscrito (con `confirm()`) → desaparece de la tabla de inscritos.
7. Re-inscribir a ese mismo Alumno al mismo grupo → funciona (fila nueva, `status = 'ACTIVA'`).
8. Inscribir al mismo Alumno en un segundo grupo distinto → ambas inscripciones activas coexisten (verificar en `/academy/groups` que el conteo de inscritos de ambos grupos incluye a ese Alumno).
9. Tecla Escape cierra tanto `AcademyGroupFormModal` como `EnrollStudentModal`.
10. Los links "Academia" en `AdminLayout` y el botón "Academia" en `HomePage` navegan correctamente a `/academy/groups`.

- [ ] **Step 2: Actualizar `docs/CURRENT_STATE.md`**

Agrega una sección "Academia — Grupos e inscripciones en `apps/admin`" (mismo formato que las secciones de Instructores/Clases/Paquetes/Clientes/Reservaciones ya existentes en "Funcionalidades implementadas") describiendo: CRUD de grupos con horario semanal (varios días/horas por grupo), inscribir/dar de baja Alumnos existentes, un Alumno puede estar en varios grupos a la vez, crear Alumno nuevo inline desde el modal de inscripción (sin salir de la página), sin cupo máximo ni RPCs (escritura vía RLS normal). Agrega la migración `012_academy_groups.sql` a "Migraciones existentes". Actualiza "In Progress"/"Next Task": este sub-proyecto completo y verificado (typecheck/lint/build + checklist manual del Step 1), pendiente de PR y merge; siguiente sub-proyecto acordado: **Academia — Clientes sin cuenta** (`docs/roadmap.md` punto 18b).

- [ ] **Step 3: Commit**

```bash
git add docs/CURRENT_STATE.md
git commit -m "docs: academia (grupos+inscripciones) completo, siguiente sub-proyecto clientes sin cuenta"
```
