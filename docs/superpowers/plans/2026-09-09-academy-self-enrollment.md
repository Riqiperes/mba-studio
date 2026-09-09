# Academia — Autoservicio de Inscripción + Visibilidad Admin Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Los padres pueden inscribir a sus hijos a un grupo de Academia (pagando una cuota de inscripción dummy), agendar una clase muestra, y ver el estado de sus solicitudes desde `apps/web`; el staff ve esas solicitudes nuevas sin buscarlas, vía una sección "Solicitudes pendientes" por grupo y un badge/contador en `apps/admin`.

**Architecture:** Migración SQL nueva agrega los estados `PENDIENTE`/`MUESTRA` a `academy_enrollments` (nunca se editan migraciones ya aplicadas) más RLS de autoservicio para clientes; `apps/web` gana un flujo Page→Componente→hook→service que hace un único INSERT por solicitud (nunca INSERT directo a `ACTIVA`); `apps/admin` extiende su service/hook existentes de Academia para listar y resolver esas solicitudes, más un hook de conteo reusado en dos páginas para el badge.

**Tech Stack:** React + Vite + TypeScript strict (ambas apps), Tailwind CSS v4, Supabase (Postgres + RLS), sin librería de formularios nueva (los modales existentes de este dominio ya usan `useState` simple; `zod` solo se usa en `apps/admin` para el formulario más complejo de `EnrollStudentModal`, no hace falta agregarlo a `apps/web` para estos formularios de 1-2 campos).

**Spec:** `docs/superpowers/specs/2026-09-09-academy-self-enrollment-and-admin-visibility-design.md`

## Global Constraints

- TypeScript strict en ambas apps; sin `any`, sin `unknown` sin validar, sin type assertions innecesarias.
- Arquitectura obligatoria: `Page -> Componente visual -> hook de la feature -> service de la feature -> Supabase`. Ningún componente llama a Supabase directo.
- RLS obligatorio en toda tabla; nunca se desactiva para "resolver" un bug.
- Toda migración es un archivo nuevo en `supabase/migrations/`, nunca se edita una ya aplicada.
- La UI (ambas apps) siempre le dice "Alumno" al registro de `dependents`, nunca "Dependiente".
- Nombres de archivo descriptivos, localizables por Ctrl+Shift+F (nada de `Form.tsx`/`Helper.ts`).
- Conventional Commits (`feat:`, `fix:`, `docs:`) en cada commit de este plan.
- **Este repo no tiene framework de test configurado** (`npm run test` es un no-op `--if-present`, cero archivos `*.test.ts*` existen hoy en `apps/web` ni `apps/admin` — verificado antes de escribir este plan). Cada tarea se verifica con `npm run typecheck` / `npm run lint` del workspace tocado y, cuando aplica, una verificación manual concreta (query SQL o flujo en navegador) — no se inventa una suite de tests que el proyecto no usa en ningún otro feature existente.
- El botón de pago de esta iteración es explícitamente **dummy**: no hay Stripe involucrado, se etiqueta como pago de prueba en la UI, y el código que lo implementa queda comentado como temporal para cuando se conecte Stripe (etapa 14 del roadmap).

---

### Task 1: Migración 027 — estados nuevos, RLS de autoservicio, cuota de inscripción

**Files:**
- Create: `supabase/migrations/027_academy_self_enrollment.sql`
- Modify: `apps/web/src/lib/database.types.ts` (regenerado, no a mano)
- Modify: `apps/admin/src/lib/database.types.ts` (regenerado, no a mano)

**Interfaces:**
- Produces (usado por todas las tareas siguientes): `academy_enrollments.status` acepta `'ACTIVA' | 'BAJA' | 'PENDIENTE' | 'MUESTRA'`; columnas nuevas `academy_enrollments.schedule_id` (uuid nullable), `academy_enrollments.trial_date` (date nullable), `academy_enrollments.registration_fee_paid` (boolean not null default false), `academy_enrollments.registration_fee_paid_at` (timestamptz nullable); columna nueva `business.academy_registration_fee_cents` (integer nullable); policies nuevas `dependents_customer_insert_own`, `dependents_customer_select_own`, `academy_enrollments_customer_insert_own`, `academy_enrollments_customer_select_own`.

- [ ] **Step 1: Escribir la migración**

```sql
-- supabase/migrations/027_academy_self_enrollment.sql
-- Autoservicio de inscripcion de Academia desde apps/web: solicitud de
-- inscripcion (PENDIENTE, requiere aprobacion de staff), clase muestra
-- (MUESTRA) y cuota de inscripcion dummy (sin Stripe todavia). Ver
-- docs/superpowers/specs/2026-09-09-academy-self-enrollment-and-admin-visibility-design.md.

-- 1. Ampliar estados de academy_enrollments (012: solo ACTIVA/BAJA). El
--    default sigue siendo ACTIVA -- las altas manuales de apps/admin
--    (EnrollStudentModal) no cambian de comportamiento.
do $$
begin
  if exists (
    select 1 from information_schema.check_constraints
    where constraint_name = 'academy_enrollments_status_check'
  ) then
    alter table public.academy_enrollments
      drop constraint academy_enrollments_status_check;
  end if;
end $$;

alter table public.academy_enrollments
  add constraint academy_enrollments_status_check
  check (status in ('ACTIVA', 'BAJA', 'PENDIENTE', 'MUESTRA'));

-- 2. Columnas de clase muestra -- solo se llenan cuando status = 'MUESTRA'.
alter table public.academy_enrollments
  add column if not exists schedule_id uuid references public.academy_group_schedules (id),
  add column if not exists trial_date date;

-- 3. Cuota de inscripcion (dummy): vive en la misma fila de la solicitud,
--    no en academy_payments (esa tabla es solo colegiatura recurrente por
--    periodo, con su propio unique constraint por periodo).
alter table public.academy_enrollments
  add column if not exists registration_fee_paid boolean not null default false,
  add column if not exists registration_fee_paid_at timestamptz;

create index if not exists academy_enrollments_status_idx
  on public.academy_enrollments (status);

-- 4. Monto fijo global de la cuota de inscripcion. Mismo patron que
--    business.whatsapp_number: lectura publica ya cubierta por la policy
--    business_select_public (001), sin UI de admin para editarla todavia
--    -- se fija con un UPDATE directo, igual que whatsapp_number hoy.
alter table public.business
  add column if not exists academy_registration_fee_cents integer;

-- 5. RLS nueva: dependents -- autoservicio del cliente (INSERT/SELECT de
--    sus propios alumnos). No se toca la policy dependents_manage_staff
--    (010) -- ambas policies conviven, se combinan con OR por RLS.
create policy "dependents_customer_insert_own"
  on public.dependents
  for insert
  with check (guardian_id = auth.uid());

create policy "dependents_customer_select_own"
  on public.dependents
  for select
  using (guardian_id = auth.uid());

-- 6. RLS nueva: academy_enrollments -- el cliente puede crear solicitudes
--    (nunca ACTIVA/BAJA directo, forzado en el with check) para alumnos
--    propios, y ver sus propias solicitudes/inscripciones.
create policy "academy_enrollments_customer_insert_own"
  on public.academy_enrollments
  for insert
  with check (
    status in ('PENDIENTE', 'MUESTRA')
    and exists (
      select 1 from public.dependents d
      where d.id = dependent_id and d.guardian_id = auth.uid()
    )
  );

create policy "academy_enrollments_customer_select_own"
  on public.academy_enrollments
  for select
  using (
    exists (
      select 1 from public.dependents d
      where d.id = dependent_id and d.guardian_id = auth.uid()
    )
  );
```

- [ ] **Step 2: Aplicar la migración al proyecto Supabase de desarrollo**

Usa la tool `mcp__claude_ai_Supabase__apply_migration` (proyecto `eazyblybekyygimqpjjw`, ver `docs/CURRENT_STATE.md`) con `name: "academy_self_enrollment"` y el SQL de arriba. Si esa tool no está disponible en el entorno de ejecución, usar el CLI de Supabase (`supabase db push` o equivalente ya usado para migraciones previas de este repo).

- [ ] **Step 3: Verificar la migración con una consulta**

Ejecutar vía `mcp__claude_ai_Supabase__execute_sql` (o el CLI):

```sql
select conname, pg_get_constraintdef(oid)
from pg_constraint
where conname = 'academy_enrollments_status_check';
```

Esperado: la definición incluye los 4 valores `'ACTIVA', 'BAJA', 'PENDIENTE', 'MUESTRA'`.

```sql
select policyname from pg_policies
where tablename in ('dependents', 'academy_enrollments')
order by tablename, policyname;
```

Esperado: aparecen las 4 policies nuevas del Step 1 junto a las ya existentes (`dependents_manage_staff`, `academy_enrollments_manage_staff`).

- [ ] **Step 4: Revisar advisories de seguridad**

Correr `mcp__claude_ai_Supabase__get_advisors` (tipo `security`) sobre el proyecto y confirmar que no aparecen advertencias nuevas atribuibles a las policies de este Step (comparar contra el baseline conocido de 14 warnings pre-existentes, ver memoria de sesión 2026-09-07).

- [ ] **Step 5: Regenerar los tipos de TypeScript en ambas apps**

Usar `mcp__claude_ai_Supabase__generate_typescript_types` y escribir el resultado completo (reemplazando el archivo, es autogenerado) en:
- `apps/web/src/lib/database.types.ts`
- `apps/admin/src/lib/database.types.ts`

- [ ] **Step 6: Typecheck de ambas apps**

Run: `npm run typecheck --workspace apps/web && npm run typecheck --workspace apps/admin`
Expected: PASS (los tipos regenerados no deberían romper código existente, ya que solo se agregan columnas/valores, no se quitan).

- [ ] **Step 7: Commit**

```bash
git add supabase/migrations/027_academy_self_enrollment.sql apps/web/src/lib/database.types.ts apps/admin/src/lib/database.types.ts
git commit -m "feat(db): estados PENDIENTE/MUESTRA y RLS de autoservicio para Academia"
```

---

### Task 2: `apps/web` — feature `dependents` propia del cliente

**Files:**
- Create: `apps/web/src/features/dependents/types/Dependent.ts`
- Create: `apps/web/src/features/dependents/services/dependentsService.ts`
- Create: `apps/web/src/features/dependents/hooks/useMyDependents.ts`

**Interfaces:**
- Consumes: tabla `dependents` con las policies `dependents_customer_insert_own`/`dependents_customer_select_own` de Task 1; `useAuth()` de `@/features/auth/hooks/AuthProvider` (expone `profile.businessId: string`).
- Produces: `type Dependent = { id, businessId, guardianId, fullName, birthDate, active, createdAt, updatedAt }`; `useMyDependents(): { dependents: Dependent[], loading: boolean, error: string | null, reload: () => Promise<void>, create: (input: { fullName: string; birthDate: string | null }) => Promise<Dependent> }` — usado por Task 4 y Task 5.

- [ ] **Step 1: Crear el tipo**

```ts
// apps/web/src/features/dependents/types/Dependent.ts
/**
 * Forma en camelCase de una fila de `dependents` propia del cliente
 * autenticado (ver supabase/migrations/010_dependents.sql y
 * supabase/migrations/027_academy_self_enrollment.sql para la RLS de
 * autoservicio). La UI siempre muestra este concepto como "Alumno", nunca
 * "Dependiente" -- mismo criterio que apps/admin/src/features/dependents.
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
```

- [ ] **Step 2: Crear el service**

```ts
// apps/web/src/features/dependents/services/dependentsService.ts
import { supabase } from "@/lib/supabaseClient";
import type { Dependent } from "../types/Dependent";

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

export async function listMyDependents(): Promise<Dependent[]> {
  const { data, error } = await supabase
    .from("dependents")
    .select(SELECT_COLUMNS)
    .order("full_name", { ascending: true });

  if (error) throw error;
  return (data as DependentRow[]).map(toDependent);
}

export async function createMyDependent(
  businessId: string,
  input: { fullName: string; birthDate: string | null },
): Promise<Dependent> {
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) throw new Error("Usuario no autenticado");

  const { data, error } = await supabase
    .from("dependents")
    .insert({
      business_id: businessId,
      guardian_id: userData.user.id,
      full_name: input.fullName,
      birth_date: input.birthDate,
    })
    .select(SELECT_COLUMNS)
    .single();

  if (error) throw error;
  return toDependent(data as DependentRow);
}
```

- [ ] **Step 3: Crear el hook**

```ts
// apps/web/src/features/dependents/hooks/useMyDependents.ts
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/features/auth/hooks/AuthProvider";
import { createMyDependent, listMyDependents } from "../services/dependentsService";
import type { Dependent } from "../types/Dependent";

export function useMyDependents() {
  const { profile } = useAuth();
  const [dependents, setDependents] = useState<Dependent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setDependents(await listMyDependents());
    } catch (err) {
      setError("No se pudieron cargar tus alumnos.");
      console.error("[dependents] listMyDependents fallo", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  async function create(input: { fullName: string; birthDate: string | null }): Promise<Dependent> {
    if (!profile?.businessId) throw new Error("Falta el negocio del cliente.");
    const created = await createMyDependent(profile.businessId, input);
    await reload();
    return created;
  }

  return { dependents, loading, error, reload, create };
}
```

- [ ] **Step 4: Typecheck**

Run: `npm run typecheck --workspace apps/web`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/features/dependents
git commit -m "feat(web): feature dependents para autoservicio de alumnos"
```

---

### Task 3: `apps/web` — cuota de inscripción en `businessService` + service/hooks de solicitudes de Academia

**Files:**
- Modify: `apps/web/src/features/studio/services/businessService.ts`
- Create: `apps/web/src/features/academy/types/MyAcademyEnrollment.ts`
- Create: `apps/web/src/features/academy/services/academyEnrollmentService.ts`
- Create: `apps/web/src/features/academy/hooks/useEnrollDependent.ts`
- Create: `apps/web/src/features/academy/hooks/useScheduleTrialClass.ts`
- Create: `apps/web/src/features/academy/hooks/useMyAcademyEnrollments.ts`
- Create: `apps/web/src/utils/getErrorMessage.ts`

**Interfaces:**
- Consumes: `Dependent` de Task 2 (por `dependentId`); tabla `academy_enrollments` con las policies de Task 1.
- Produces: `Business.academyRegistrationFeeCents: number | null`; `createEnrollmentRequest(businessId, dependentId, groupId): Promise<void>`; `createTrialClassRequest(businessId, dependentId, groupId, scheduleId, trialDate): Promise<void>`; `listMyAcademyEnrollments(): Promise<MyAcademyEnrollment[]>`; `useEnrollDependent(): { submitting, error, enroll }`; `useScheduleTrialClass(): { submitting, error, scheduleTrial }`; `useMyAcademyEnrollments(): { enrollments, loading, error, reload }`; `getErrorMessage(err: unknown, fallback: string): string` — todo esto lo consumen las Tasks 4, 5 y 7.

- [ ] **Step 1: Agregar `academyRegistrationFeeCents` a `businessService.ts`**

Modificar `apps/web/src/features/studio/services/businessService.ts`:

```ts
// SELECT_COLUMNS: agregar ", academy_registration_fee_cents" al final del string existente.

export type Business = {
  id: string;
  name: string;
  description: string | null;
  address: string | null;
  phone: string | null;
  whatsappNumber: string | null;
  logoUrl: string | null;
  faviconUrl: string | null;
  primaryColor: string;
  accentColor: string;
  academyRegistrationFeeCents: number | null;
  createdAt: string;
  updatedAt: string;
};

type BusinessRow = {
  id: string;
  name: string;
  description: string | null;
  address: string | null;
  phone: string | null;
  whatsapp_number: string | null;
  logo_url: string | null;
  favicon_url: string | null;
  primary_color: string;
  accent_color: string;
  academy_registration_fee_cents: number | null;
  created_at: string;
  updated_at: string;
};

function toBusiness(row: BusinessRow): Business {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    address: row.address,
    phone: row.phone,
    whatsappNumber: row.whatsapp_number,
    logoUrl: row.logo_url,
    faviconUrl: row.favicon_url,
    primaryColor: row.primary_color,
    accentColor: row.accent_color,
    academyRegistrationFeeCents: row.academy_registration_fee_cents,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
```

(`getBusiness()` no cambia, ya usa `SELECT_COLUMNS`/`toBusiness`.)

- [ ] **Step 2: Crear el tipo de "mis inscripciones"**

```ts
// apps/web/src/features/academy/types/MyAcademyEnrollment.ts
export type MyAcademyEnrollmentStatus = "PENDIENTE" | "ACTIVA" | "BAJA" | "MUESTRA";

export type MyAcademyEnrollment = {
  id: string;
  dependentId: string;
  studentName: string;
  groupId: string;
  groupName: string;
  status: MyAcademyEnrollmentStatus;
  enrollmentDate: string;
  trialDate: string | null;
  createdAt: string;
};
```

- [ ] **Step 3: Crear el service de solicitudes**

```ts
// apps/web/src/features/academy/services/academyEnrollmentService.ts
import { supabase } from "@/lib/supabaseClient";
import type { MyAcademyEnrollment, MyAcademyEnrollmentStatus } from "../types/MyAcademyEnrollment";

const ENROLLMENT_COLUMNS = "id, dependent_id, group_id, status, enrollment_date, trial_date, created_at";

type EnrollmentRow = {
  id: string;
  dependent_id: string;
  group_id: string;
  status: MyAcademyEnrollmentStatus;
  enrollment_date: string;
  trial_date: string | null;
  created_at: string;
  dependents: { full_name: string } | null;
  academy_groups: { name: string } | null;
};

export async function listMyAcademyEnrollments(): Promise<MyAcademyEnrollment[]> {
  const { data, error } = await supabase
    .from("academy_enrollments")
    .select(`${ENROLLMENT_COLUMNS}, dependents(full_name), academy_groups(name)`)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data as EnrollmentRow[]).map((row) => ({
    id: row.id,
    dependentId: row.dependent_id,
    studentName: row.dependents?.full_name ?? "-",
    groupId: row.group_id,
    groupName: row.academy_groups?.name ?? "-",
    status: row.status,
    enrollmentDate: row.enrollment_date,
    trialDate: row.trial_date,
    createdAt: row.created_at,
  }));
}

/**
 * Cuota de inscripcion DUMMY: marca registration_fee_paid=true sin pasar
 * por Stripe. Reemplazar cuando la etapa 14 (Stripe) conecte un cobro
 * real -- ver docs/superpowers/specs/2026-09-09-academy-self-enrollment-and-admin-visibility-design.md.
 */
export async function createEnrollmentRequest(
  businessId: string,
  dependentId: string,
  groupId: string,
): Promise<void> {
  const { error } = await supabase.from("academy_enrollments").insert({
    business_id: businessId,
    dependent_id: dependentId,
    group_id: groupId,
    status: "PENDIENTE",
    registration_fee_paid: true,
    registration_fee_paid_at: new Date().toISOString(),
  });

  if (error) throw error;
}

export async function createTrialClassRequest(
  businessId: string,
  dependentId: string,
  groupId: string,
  scheduleId: string,
  trialDate: string,
): Promise<void> {
  const { error } = await supabase.from("academy_enrollments").insert({
    business_id: businessId,
    dependent_id: dependentId,
    group_id: groupId,
    status: "MUESTRA",
    schedule_id: scheduleId,
    trial_date: trialDate,
  });

  if (error) throw error;
}
```

- [ ] **Step 4: Crear `useEnrollDependent`**

```ts
// apps/web/src/features/academy/hooks/useEnrollDependent.ts
import { useState } from "react";
import { createEnrollmentRequest } from "../services/academyEnrollmentService";

export function useEnrollDependent() {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function enroll(businessId: string, dependentId: string, groupId: string): Promise<void> {
    setSubmitting(true);
    setError(null);
    try {
      await createEnrollmentRequest(businessId, dependentId, groupId);
    } catch (err) {
      setError("No se pudo enviar la solicitud de inscripción.");
      console.error("[academy] createEnrollmentRequest fallo", err);
      throw err;
    } finally {
      setSubmitting(false);
    }
  }

  return { submitting, error, enroll };
}
```

- [ ] **Step 5: Crear `useScheduleTrialClass`**

```ts
// apps/web/src/features/academy/hooks/useScheduleTrialClass.ts
import { useState } from "react";
import { createTrialClassRequest } from "../services/academyEnrollmentService";

export function useScheduleTrialClass() {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function scheduleTrial(
    businessId: string,
    dependentId: string,
    groupId: string,
    scheduleId: string,
    trialDate: string,
  ): Promise<void> {
    setSubmitting(true);
    setError(null);
    try {
      await createTrialClassRequest(businessId, dependentId, groupId, scheduleId, trialDate);
    } catch (err) {
      setError("No se pudo agendar la clase muestra.");
      console.error("[academy] createTrialClassRequest fallo", err);
      throw err;
    } finally {
      setSubmitting(false);
    }
  }

  return { submitting, error, scheduleTrial };
}
```

- [ ] **Step 6: Crear `useMyAcademyEnrollments`**

```ts
// apps/web/src/features/academy/hooks/useMyAcademyEnrollments.ts
import { useCallback, useEffect, useState } from "react";
import { listMyAcademyEnrollments } from "../services/academyEnrollmentService";
import type { MyAcademyEnrollment } from "../types/MyAcademyEnrollment";

export function useMyAcademyEnrollments() {
  const [enrollments, setEnrollments] = useState<MyAcademyEnrollment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setEnrollments(await listMyAcademyEnrollments());
    } catch (err) {
      setError("No se pudieron cargar tus inscripciones de Academia.");
      console.error("[academy] listMyAcademyEnrollments fallo", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  return { enrollments, loading, error, reload };
}
```

- [ ] **Step 7: Copiar `getErrorMessage` a `apps/web`**

`apps/admin/src/utils/getErrorMessage.ts` ya existe y resuelve el mismo problema (los errores de Postgrest no son instancias de `Error`) que van a necesitar los modales de la Task 4/5. Es una utilidad de 25 líneas sin dependencias de admin — copiarla tal cual a `apps/web` es más simple que promoverla a `packages/shared` y tener que re-tocar los 11 archivos de `apps/admin` que ya la importan (fuera de alcance de este plan):

```ts
// apps/web/src/utils/getErrorMessage.ts
/**
 * `supabase.rpc()`/`.from()` errors (PostgrestError) are plain objects at
 * runtime, not `Error` instances, despite the postgrest-js source declaring
 * `class PostgrestError extends Error` -- verified live against this
 * project's installed @supabase/supabase-js: `error instanceof Error` is
 * false for every RPC/query error, so a bare `err instanceof Error` check
 * silently swallows every Postgres `raise exception` message (cupo lleno,
 * sin creditos, no autorizado, etc.) behind a generic fallback. Duck-typing
 * on `message` handles both real Error instances and Postgrest error
 * objects.
 */
export function getErrorMessage(err: unknown, fallback: string): string {
  if (typeof err === "object" && err !== null) {
    if ("code" in err && (err as { code: unknown }).code === "23505") {
      // Postgres unique_violation: el texto crudo ("duplicate key value
      // violates unique constraint ...") no le sirve al usuario final.
      return "Ya existe un registro con esos datos.";
    }
    if ("message" in err) {
      const message = (err as { message: unknown }).message;
      if (typeof message === "string" && message.length > 0) return message;
    }
  }
  return fallback;
}
```

- [ ] **Step 8: Typecheck**

Run: `npm run typecheck --workspace apps/web`
Expected: PASS

- [ ] **Step 9: Commit**

```bash
git add apps/web/src/features/studio/services/businessService.ts apps/web/src/features/academy/types/MyAcademyEnrollment.ts apps/web/src/features/academy/services/academyEnrollmentService.ts apps/web/src/features/academy/hooks/useEnrollDependent.ts apps/web/src/features/academy/hooks/useScheduleTrialClass.ts apps/web/src/features/academy/hooks/useMyAcademyEnrollments.ts apps/web/src/utils/getErrorMessage.ts
git commit -m "feat(web): service y hooks de solicitudes de Academia + cuota de inscripcion"
```

---

### Task 4: `apps/web` — `EnrollAndPayModal` (inscribir + pago dummy)

**Files:**
- Create: `apps/web/src/features/academy/components/EnrollAndPayModal.tsx`

**Interfaces:**
- Consumes: `useMyDependents()` (Task 2), `useEnrollDependent()` (Task 3), `useAuth()` (`profile.businessId`), `getErrorMessage` (Task 3), `Button` de `@/components/ui/Button`.
- Produces: `<EnrollAndPayModal open groupId groupName registrationFeeCents onClose onSuccess />` — consumido por Task 6.

- [ ] **Step 1: Crear el componente**

```tsx
// apps/web/src/features/academy/components/EnrollAndPayModal.tsx
import { useEffect, useState, type FormEvent } from "react";
import { useAuth } from "@/features/auth/hooks/AuthProvider";
import { useMyDependents } from "@/features/dependents/hooks/useMyDependents";
import { useEnrollDependent } from "@/features/academy/hooks/useEnrollDependent";
import { Button } from "@/components/ui/Button";
import { getErrorMessage } from "@/utils/getErrorMessage";

function formatCents(cents: number | null): string {
  if (cents == null) return "monto por confirmar";
  return `$${(cents / 100).toFixed(2)} MXN`;
}

type Props = {
  open: boolean;
  groupId: string;
  groupName: string;
  registrationFeeCents: number | null;
  onClose: () => void;
  onSuccess: () => void;
};

export function EnrollAndPayModal({
  open,
  groupId,
  groupName,
  registrationFeeCents,
  onClose,
  onSuccess,
}: Props) {
  const { profile } = useAuth();
  const { dependents, loading: dependentsLoading, create } = useMyDependents();
  const { submitting, enroll } = useEnrollDependent();

  const [dependentId, setDependentId] = useState("");
  const [showNewStudentForm, setShowNewStudentForm] = useState(false);
  const [newStudentName, setNewStudentName] = useState("");
  const [newStudentBirthDate, setNewStudentBirthDate] = useState("");
  const [creatingStudent, setCreatingStudent] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setDependentId("");
    setShowNewStudentForm(dependents.length === 0);
    setNewStudentName("");
    setNewStudentBirthDate("");
    setFormError(null);
  }, [open, dependents.length]);

  if (!open) return null;

  async function handleCreateStudent(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!newStudentName.trim()) {
      setFormError("El nombre del alumno es obligatorio.");
      return;
    }
    setFormError(null);
    setCreatingStudent(true);
    try {
      const created = await create({
        fullName: newStudentName.trim(),
        birthDate: newStudentBirthDate || null,
      });
      setDependentId(created.id);
      setShowNewStudentForm(false);
    } catch (err) {
      setFormError(getErrorMessage(err, "No se pudo crear el alumno."));
      console.error("[academy] crear alumno fallo", err);
    } finally {
      setCreatingStudent(false);
    }
  }

  async function handleSubmit() {
    if (!profile?.businessId) {
      setFormError("Falta el negocio del cliente.");
      return;
    }
    if (!dependentId) {
      setFormError("Elige un alumno.");
      return;
    }
    setFormError(null);
    try {
      await enroll(profile.businessId, dependentId, groupId);
      onSuccess();
      onClose();
    } catch (err) {
      setFormError(getErrorMessage(err, "No se pudo enviar la solicitud."));
    }
  }

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        id="enroll-and-pay-modal"
        className="flex w-full max-w-md flex-col gap-3 rounded-lg bg-white p-6"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 className="text-lg font-semibold text-brand-primary">Inscribir a {groupName}</h2>
        <p className="text-sm text-gray-600">
          Tu solicitud queda pendiente de aprobación por el staff. La cuota de inscripción es de{" "}
          {formatCents(registrationFeeCents)}. <strong>Este es un pago de prueba</strong>, todavía no
          procesamos cobros reales — el staff confirmará el pago cuando revise tu solicitud.
        </p>

        {dependentsLoading ? (
          <p className="text-sm text-gray-500">Cargando tus alumnos...</p>
        ) : !showNewStudentForm ? (
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
              Agregar alumno nuevo
            </button>
          </div>
        ) : (
          <form
            id="enroll-new-student-form"
            onSubmit={handleCreateStudent}
            noValidate
            className="flex flex-col gap-2 rounded-md border border-gray-200 p-3"
          >
            <input
              id="enroll-new-student-name-input"
              type="text"
              placeholder="Nombre completo del alumno"
              value={newStudentName}
              onChange={(event) => setNewStudentName(event.target.value)}
              className="rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
            <input
              id="enroll-new-student-birthdate-input"
              type="date"
              value={newStudentBirthDate}
              onChange={(event) => setNewStudentBirthDate(event.target.value)}
              className="rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
            <div className="flex justify-end gap-2">
              {dependents.length > 0 && (
                <button
                  type="button"
                  onClick={() => setShowNewStudentForm(false)}
                  className="px-3 py-1 text-xs text-gray-600"
                >
                  Cancelar
                </button>
              )}
              <button
                type="submit"
                disabled={creatingStudent}
                className="rounded-md bg-brand-primary px-3 py-1 text-xs font-medium text-white hover:opacity-90 disabled:opacity-50"
              >
                {creatingStudent ? "Creando..." : "Crear alumno"}
              </button>
            </div>
          </form>
        )}

        {formError && <p className="text-sm text-red-600">{formError}</p>}

        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-gray-600">
            Cancelar
          </button>
          <Button
            variant="primary"
            onClick={handleSubmit}
            disabled={submitting || !dependentId || showNewStudentForm}
            loading={submitting}
          >
            Pagar inscripción e inscribir
          </Button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck --workspace apps/web`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/features/academy/components/EnrollAndPayModal.tsx
git commit -m "feat(web): modal de inscripcion + pago dummy de cuota de inscripcion"
```

---

### Task 5: `apps/web` — `TrialClassModal` (agendar clase muestra)

**Files:**
- Create: `apps/web/src/features/academy/components/TrialClassModal.tsx`

**Interfaces:**
- Consumes: `useMyDependents()` (Task 2), `useScheduleTrialClass()` (Task 3), `useAuth()`, `getErrorMessage` (Task 3), `AcademyGroupCatalogItem` de `apps/web/src/features/academy/types/AcademyGroup.ts` (ya existente, campos `id`, `name`, `schedules: { id, dayOfWeek, startTime, endTime }[]`).
- Produces: `<TrialClassModal open group onClose onSuccess />` — consumido por Task 6.

- [ ] **Step 1: Crear el componente**

```tsx
// apps/web/src/features/academy/components/TrialClassModal.tsx
import { useEffect, useState } from "react";
import { useAuth } from "@/features/auth/hooks/AuthProvider";
import { useMyDependents } from "@/features/dependents/hooks/useMyDependents";
import { useScheduleTrialClass } from "@/features/academy/hooks/useScheduleTrialClass";
import { Button } from "@/components/ui/Button";
import { getErrorMessage } from "@/utils/getErrorMessage";
import type { AcademyGroupCatalogItem } from "../types/AcademyGroup";

const DAY_NAMES = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];

function nextOccurrenceOf(dayOfWeek: number): string {
  const today = new Date();
  const diff = (dayOfWeek - today.getDay() + 7) % 7;
  const date = new Date(today);
  date.setDate(today.getDate() + diff);
  return date.toISOString().slice(0, 10);
}

type Props = {
  open: boolean;
  group: AcademyGroupCatalogItem;
  onClose: () => void;
  onSuccess: () => void;
};

export function TrialClassModal({ open, group, onClose, onSuccess }: Props) {
  const { profile } = useAuth();
  const { dependents, loading: dependentsLoading } = useMyDependents();
  const { submitting, scheduleTrial } = useScheduleTrialClass();

  const [dependentId, setDependentId] = useState("");
  const [scheduleId, setScheduleId] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setDependentId("");
    setScheduleId(group.schedules[0]?.id ?? "");
    setFormError(null);
  }, [open, group.schedules]);

  if (!open) return null;

  const selectedSchedule = group.schedules.find((s) => s.id === scheduleId);
  const trialDate = selectedSchedule ? nextOccurrenceOf(selectedSchedule.dayOfWeek) : null;

  async function handleSubmit() {
    if (!profile?.businessId) {
      setFormError("Falta el negocio del cliente.");
      return;
    }
    if (!dependentId) {
      setFormError("Elige un alumno.");
      return;
    }
    if (!scheduleId || !trialDate) {
      setFormError("Elige un horario.");
      return;
    }
    setFormError(null);
    try {
      await scheduleTrial(profile.businessId, dependentId, group.id, scheduleId, trialDate);
      onSuccess();
      onClose();
    } catch (err) {
      setFormError(getErrorMessage(err, "No se pudo agendar la clase muestra."));
    }
  }

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        id="trial-class-modal"
        className="flex w-full max-w-md flex-col gap-3 rounded-lg bg-white p-6"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 className="text-lg font-semibold text-brand-primary">Clase muestra — {group.name}</h2>
        <p className="text-sm text-gray-600">Sin costo. El staff confirmará tu lugar.</p>

        <div className="flex flex-col gap-1">
          <label htmlFor="trial-dependent-select" className="text-xs text-gray-500">
            Alumno
          </label>
          <select
            id="trial-dependent-select"
            value={dependentId}
            onChange={(event) => setDependentId(event.target.value)}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm"
            disabled={dependentsLoading}
          >
            <option value="">Elige un alumno</option>
            {dependents.map((dependent) => (
              <option key={dependent.id} value={dependent.id}>
                {dependent.fullName}
              </option>
            ))}
          </select>
          {dependents.length === 0 && !dependentsLoading && (
            <p className="text-xs text-gray-500">
              Primero agrega un alumno desde "Inscribir y pagar inscripción".
            </p>
          )}
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="trial-schedule-select" className="text-xs text-gray-500">
            Horario
          </label>
          <select
            id="trial-schedule-select"
            value={scheduleId}
            onChange={(event) => setScheduleId(event.target.value)}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm"
          >
            {group.schedules.map((schedule) => (
              <option key={schedule.id} value={schedule.id}>
                {DAY_NAMES[schedule.dayOfWeek]} {schedule.startTime.slice(0, 5)}-{schedule.endTime.slice(0, 5)}
              </option>
            ))}
          </select>
          {trialDate && <p className="text-xs text-gray-500">Fecha propuesta: {trialDate}</p>}
        </div>

        {formError && <p className="text-sm text-red-600">{formError}</p>}

        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-gray-600">
            Cancelar
          </button>
          <Button variant="primary" onClick={handleSubmit} disabled={submitting} loading={submitting}>
            Agendar clase muestra
          </Button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck --workspace apps/web`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/features/academy/components/TrialClassModal.tsx
git commit -m "feat(web): modal para agendar clase muestra"
```

---

### Task 6: `apps/web` — conectar `AcademyGroupCard` y `AcademyCatalogPage`

**Files:**
- Modify: `apps/web/src/features/academy/components/AcademyGroupCard.tsx`
- Modify: `apps/web/src/features/academy/components/AcademyCatalogPage.tsx`

**Interfaces:**
- Consumes: `EnrollAndPayModal` (Task 4), `TrialClassModal` (Task 5), `useAuth()` (`session`), `useNavigate` de `react-router-dom`, `Business.academyRegistrationFeeCents` (Task 3).

- [ ] **Step 1: Reescribir `AcademyGroupCard.tsx`**

```tsx
// apps/web/src/features/academy/components/AcademyGroupCard.tsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/features/auth/hooks/AuthProvider";
import { Button } from "@/components/ui/Button";
import { EnrollAndPayModal } from "./EnrollAndPayModal";
import { TrialClassModal } from "./TrialClassModal";
import type { AcademyGroupCatalogItem } from "../types/AcademyGroup";

const DAY_ABBREVIATIONS = ["Dom", "Lun", "Mar", "Mie", "Jue", "Vie", "Sab"];

function formatSchedule(group: AcademyGroupCatalogItem): string {
  if (group.schedules.length === 0) return "Sin horario";
  return group.schedules
    .map((s) => `${DAY_ABBREVIATIONS[s.dayOfWeek]} ${s.startTime.slice(0, 5)}-${s.endTime.slice(0, 5)}`)
    .join(", ");
}

function formatAgeRange(group: AcademyGroupCatalogItem): string {
  if (group.ageMin == null && group.ageMax == null) return "Todas las edades";
  if (group.ageMin != null && group.ageMax != null) return `${group.ageMin}-${group.ageMax} años`;
  if (group.ageMin != null) return `Desde ${group.ageMin} años`;
  return `Hasta ${group.ageMax} años`;
}

function formatWhatsAppLink(whatsappNumber: string | null, group: AcademyGroupCatalogItem): string {
  const message = encodeURIComponent(
    `Hola, quiero inscribir a mi hijo/a al grupo "${group.name}" de la Academia de Ballet.`,
  );
  if (!whatsappNumber) return `https://wa.me/?text=${message}`;
  const cleaned = whatsappNumber.replace(/\D/g, "");
  return `https://wa.me/52${cleaned}?text=${message}`;
}

export function AcademyGroupCard({
  group,
  whatsappNumber,
  registrationFeeCents,
}: {
  group: AcademyGroupCatalogItem;
  whatsappNumber: string | null;
  registrationFeeCents: number | null;
}) {
  const { session } = useAuth();
  const navigate = useNavigate();
  const [enrollModalOpen, setEnrollModalOpen] = useState(false);
  const [trialModalOpen, setTrialModalOpen] = useState(false);
  const [requestSent, setRequestSent] = useState<"enroll" | "trial" | null>(null);

  function requireSession(open: () => void) {
    if (!session) {
      navigate(`/login?redirectTo=${encodeURIComponent("/academy")}`);
      return;
    }
    open();
  }

  return (
    <article
      id={`academy-group-card-${group.id}`}
      className="flex flex-col h-full rounded-lg border border-gray-200 bg-white p-6 shadow-sm"
    >
      <div className="mb-4 flex flex-col gap-1">
        <h3 className="text-lg font-semibold text-brand-primary">{group.name}</h3>
        {group.instructorName && <p className="text-sm text-gray-600">Instructor: {group.instructorName}</p>}
      </div>

      <div className="mb-4 flex flex-col gap-1 text-sm text-gray-700">
        <p>{formatSchedule(group)}</p>
        <p>{formatAgeRange(group)}</p>
      </div>

      {requestSent && (
        <p className="mb-3 text-sm text-green-700">
          {requestSent === "enroll"
            ? "Solicitud enviada. El staff la revisará pronto."
            : "Clase muestra solicitada. El staff confirmará tu lugar."}
        </p>
      )}

      <div className="mt-auto flex flex-col gap-2 pt-4 border-t border-gray-100">
        <Button
          variant="primary"
          size="lg"
          className="w-full"
          onClick={() => requireSession(() => setEnrollModalOpen(true))}
        >
          Inscribir y pagar inscripción
        </Button>
        {group.schedules.length > 0 && (
          <Button
            variant="outline"
            size="lg"
            className="w-full"
            onClick={() => requireSession(() => setTrialModalOpen(true))}
          >
            Agendar clase muestra
          </Button>
        )}
        <button
          type="button"
          onClick={() => window.open(formatWhatsAppLink(whatsappNumber, group), "_blank")}
          className="text-xs text-gray-500 hover:underline"
        >
          💬 O escríbenos por WhatsApp
        </button>
      </div>

      <EnrollAndPayModal
        open={enrollModalOpen}
        groupId={group.id}
        groupName={group.name}
        registrationFeeCents={registrationFeeCents}
        onClose={() => setEnrollModalOpen(false)}
        onSuccess={() => setRequestSent("enroll")}
      />
      <TrialClassModal
        open={trialModalOpen}
        group={group}
        onClose={() => setTrialModalOpen(false)}
        onSuccess={() => setRequestSent("trial")}
      />
    </article>
  );
}
```

- [ ] **Step 2: Actualizar `AcademyCatalogPage.tsx`**

```tsx
// apps/web/src/features/academy/components/AcademyCatalogPage.tsx
import { useEffect, useState } from "react";
import { useAcademyGroups } from "@/features/academy/hooks/useAcademyGroups";
import { AcademyGroupCard } from "@/features/academy/components/AcademyGroupCard";
import { getBusiness } from "@/features/studio/services/businessService";
import { BackButton } from "@/components/ui/BackButton";

export function AcademyCatalogPage() {
  const { groups, loading, error } = useAcademyGroups();
  const [whatsappNumber, setWhatsappNumber] = useState<string | null>(null);
  const [registrationFeeCents, setRegistrationFeeCents] = useState<number | null>(null);

  useEffect(() => {
    getBusiness().then((business) => {
      setWhatsappNumber(business?.whatsappNumber ?? null);
      setRegistrationFeeCents(business?.academyRegistrationFeeCents ?? null);
    });
  }, []);

  return (
    <div id="academy-catalog-page" className="mx-auto max-w-5xl p-6">
      <BackButton />
      <header className="mb-8">
        <h1 className="text-2xl font-semibold text-brand-primary">Academia de Ballet</h1>
        <p className="mt-1 text-gray-600">
          Consulta los grupos disponibles y sus horarios. Inscribe a tu hijo/a o agenda una clase
          muestra directamente aquí.
        </p>
      </header>

      {error && (
        <div id="academy-error" className="mb-6 rounded-md bg-red-50 p-4 text-sm text-red-600">
          {error}
        </div>
      )}

      {loading ? (
        <div id="academy-loading" className="flex items-center justify-center py-12 text-gray-500">
          Cargando grupos...
        </div>
      ) : groups.length === 0 ? (
        <div id="academy-empty" className="text-center py-12 text-gray-500">
          <p>Todavía no hay grupos de Academia disponibles.</p>
        </div>
      ) : (
        <div id="academy-groups-grid" className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {groups.map((group) => (
            <AcademyGroupCard
              key={group.id}
              group={group}
              whatsappNumber={whatsappNumber}
              registrationFeeCents={registrationFeeCents}
            />
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Typecheck + lint**

Run: `npm run typecheck --workspace apps/web && npm run lint --workspace apps/web`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/features/academy/components/AcademyGroupCard.tsx apps/web/src/features/academy/components/AcademyCatalogPage.tsx
git commit -m "feat(web): conectar inscripcion, clase muestra y pago dummy en AcademyGroupCard"
```

---

### Task 7: `apps/web` — "Mis alumnos e inscripciones" en `UserProfilePage`

**Files:**
- Modify: `apps/web/src/features/auth/components/UserProfilePage.tsx`

**Interfaces:**
- Consumes: `useMyAcademyEnrollments()` (Task 3).

- [ ] **Step 1: Agregar el import y el hook**

En `apps/web/src/features/auth/components/UserProfilePage.tsx`, agregar al inicio:

```tsx
import { Link } from "react-router-dom";
import { useMyAcademyEnrollments } from "@/features/academy/hooks/useMyAcademyEnrollments";

const STATUS_LABELS: Record<string, string> = {
  PENDIENTE: "Pendiente de aprobación",
  ACTIVA: "Activa",
  BAJA: "Inactiva",
  MUESTRA: "Clase muestra solicitada",
};

const STATUS_CLASSES: Record<string, string> = {
  PENDIENTE: "bg-yellow-100 text-yellow-800",
  ACTIVA: "bg-green-100 text-green-800",
  BAJA: "bg-gray-100 text-gray-600",
  MUESTRA: "bg-blue-100 text-blue-800",
};
```

Dentro de `export function UserProfilePage() {`, junto al resto de hooks:

```tsx
const { enrollments, loading: enrollmentsLoading } = useMyAcademyEnrollments();
```

- [ ] **Step 2: Agregar la sección nueva antes del `</div>` final**

Insertar, después del último `<Card>` existente ("Información de la cuenta") y antes del `</div>` de cierre de `#user-profile-page`:

```tsx
<Card>
  <CardContent className="space-y-3 p-6">
    <h2 className="text-lg font-semibold text-gray-900">Mis alumnos e inscripciones</h2>
    {enrollmentsLoading ? (
      <p className="text-sm text-gray-500">Cargando...</p>
    ) : enrollments.length === 0 ? (
      <p className="text-sm text-gray-500">
        Todavía no has inscrito a ningún alumno. Ve a{" "}
        <Link to="/academy" className="text-brand-primary hover:underline">
          Academia
        </Link>{" "}
        para inscribir o agendar una clase muestra.
      </p>
    ) : (
      <ul id="my-academy-enrollments-list" className="space-y-2 text-sm">
        {enrollments.map((enrollment) => (
          <li
            key={enrollment.id}
            className="flex items-center justify-between gap-2 border-b border-gray-100 pb-2 last:border-0"
          >
            <div>
              <p className="font-medium text-gray-900">{enrollment.studentName}</p>
              <p className="text-xs text-gray-500">{enrollment.groupName}</p>
            </div>
            <span
              className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_CLASSES[enrollment.status]}`}
            >
              {STATUS_LABELS[enrollment.status]}
            </span>
          </li>
        ))}
      </ul>
    )}
  </CardContent>
</Card>
```

- [ ] **Step 3: Typecheck**

Run: `npm run typecheck --workspace apps/web`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/features/auth/components/UserProfilePage.tsx
git commit -m "feat(web): seccion Mis alumnos e inscripciones en el perfil"
```

---

### Task 8: `apps/admin` — extender tipos y service de Academia (solicitudes + conteo)

**Files:**
- Modify: `apps/admin/src/features/academy/types/AcademyEnrollment.ts`
- Modify: `apps/admin/src/features/academy/services/academyEnrollmentsService.ts`

**Interfaces:**
- Produces: `AcademyEnrollment.status: "ACTIVA" | "BAJA" | "PENDIENTE" | "MUESTRA"`; `AcademyEnrollmentWithStudent.scheduleLabel: string | null`; `listPendingRequestsByGroup(groupId): Promise<AcademyEnrollmentWithStudent[]>`; `approveEnrollment(id): Promise<void>`; `countPendingAcademyRequests(): Promise<number>` — usados por Task 9 y 10. `withdrawEnrollment` (ya existente, sin cambios) se reutiliza para "Rechazar" y "Marcar atendida" — ambas acciones solo necesitan sacar la fila de `PENDIENTE`/`MUESTRA` a `BAJA`, no hace falta una función nueva por cada botón.

- [ ] **Step 1: Extender el tipo `AcademyEnrollment.ts`**

```ts
// apps/admin/src/features/academy/types/AcademyEnrollment.ts
/**
 * Forma en camelCase de una fila de `academy_enrollments` (ver
 * supabase/migrations/012_academy_groups.sql y
 * supabase/migrations/027_academy_self_enrollment.sql).
 */
export type AcademyEnrollment = {
  id: string;
  businessId: string;
  dependentId: string;
  groupId: string;
  enrollmentDate: string;
  status: "ACTIVA" | "BAJA" | "PENDIENTE" | "MUESTRA";
  scheduleId: string | null;
  trialDate: string | null;
  registrationFeePaid: boolean;
  createdAt: string;
  updatedAt: string;
};

/** Usado en la tabla de inscritos/solicitudes de un grupo, con nombre de alumno/tutor. */
export type AcademyEnrollmentWithStudent = AcademyEnrollment & {
  studentName: string;
  guardianName: string | null;
  /** Descuento por referido del tutor (0 si no tiene cuenta o no tiene descuento). */
  guardianDiscountPercent: number;
  /** Solo para status = 'MUESTRA': dia/horario elegido, formateado ("Lun 16:00-17:00"). */
  scheduleLabel: string | null;
};
```

- [ ] **Step 2: Extender `academyEnrollmentsService.ts`**

```ts
// apps/admin/src/features/academy/services/academyEnrollmentsService.ts
import { supabase } from "@/lib/supabaseClient";
import type { AcademyEnrollment, AcademyEnrollmentWithStudent } from "../types/AcademyEnrollment";

const ENROLLMENT_COLUMNS =
  "id, business_id, dependent_id, group_id, enrollment_date, status, schedule_id, trial_date, registration_fee_paid, created_at, updated_at";

type EnrollmentRow = {
  id: string;
  business_id: string;
  dependent_id: string;
  group_id: string;
  enrollment_date: string;
  status: AcademyEnrollment["status"];
  schedule_id: string | null;
  trial_date: string | null;
  registration_fee_paid: boolean;
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
    scheduleId: row.schedule_id,
    trialDate: row.trial_date,
    registrationFeePaid: row.registration_fee_paid,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

const DAY_ABBREVIATIONS = ["Dom", "Lun", "Mar", "Mie", "Jue", "Vie", "Sab"];

function toScheduleLabel(
  schedule: { day_of_week: number; start_time: string; end_time: string } | null,
): string | null {
  if (!schedule) return null;
  return `${DAY_ABBREVIATIONS[schedule.day_of_week]} ${schedule.start_time.slice(0, 5)}-${schedule.end_time.slice(0, 5)}`;
}

type EnrollmentWithStudentRow = EnrollmentRow & {
  dependents: {
    full_name: string;
    guardian_name: string | null;
    profiles: { full_name: string | null; discount_percent: number } | null;
  } | null;
  academy_group_schedules: { day_of_week: number; start_time: string; end_time: string } | null;
};

function toEnrollmentWithStudent(row: EnrollmentWithStudentRow): AcademyEnrollmentWithStudent {
  return {
    ...toEnrollment(row),
    studentName: row.dependents?.full_name ?? "-",
    guardianName: row.dependents?.guardian_name ?? row.dependents?.profiles?.full_name ?? null,
    guardianDiscountPercent: row.dependents?.profiles?.discount_percent ?? 0,
    scheduleLabel: toScheduleLabel(row.academy_group_schedules),
  };
}

const WITH_STUDENT_SELECT = `${ENROLLMENT_COLUMNS}, dependents(full_name, guardian_name, profiles(full_name, discount_percent)), academy_group_schedules(day_of_week, start_time, end_time)`;

export async function listEnrollmentsByGroup(groupId: string): Promise<AcademyEnrollmentWithStudent[]> {
  const { data, error } = await supabase
    .from("academy_enrollments")
    .select(WITH_STUDENT_SELECT)
    .eq("group_id", groupId)
    .eq("status", "ACTIVA")
    .order("enrollment_date", { ascending: true });

  if (error) throw error;
  return (data as EnrollmentWithStudentRow[]).map(toEnrollmentWithStudent);
}

export async function listPendingRequestsByGroup(groupId: string): Promise<AcademyEnrollmentWithStudent[]> {
  const { data, error } = await supabase
    .from("academy_enrollments")
    .select(WITH_STUDENT_SELECT)
    .eq("group_id", groupId)
    .in("status", ["PENDIENTE", "MUESTRA"])
    .order("created_at", { ascending: true });

  if (error) throw error;
  return (data as EnrollmentWithStudentRow[]).map(toEnrollmentWithStudent);
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
  return toEnrollment(data as EnrollmentRow);
}

export async function approveEnrollment(id: string): Promise<void> {
  const { error } = await supabase
    .from("academy_enrollments")
    .update({ status: "ACTIVA", updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) throw error;
}

export async function withdrawEnrollment(id: string): Promise<void> {
  const { error } = await supabase
    .from("academy_enrollments")
    .update({ status: "BAJA", updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) throw error;
}

export async function countPendingAcademyRequests(): Promise<number> {
  const { count, error } = await supabase
    .from("academy_enrollments")
    .select("id", { count: "exact", head: true })
    .in("status", ["PENDIENTE", "MUESTRA"]);

  if (error) throw error;
  return count ?? 0;
}
```

- [ ] **Step 3: Typecheck**

Run: `npm run typecheck --workspace apps/admin`
Expected: PASS. Si falla por el tipo de `enrollStudent`/`withdrawEnrollment` en `useAcademyGroupEnrollments.ts`, no hace falta tocar ese hook — sus firmas no cambiaron, solo el tipo `AcademyEnrollment` ganó campos nuevos que ya vienen con valores desde `toEnrollment`.

- [ ] **Step 4: Commit**

```bash
git add apps/admin/src/features/academy/types/AcademyEnrollment.ts apps/admin/src/features/academy/services/academyEnrollmentsService.ts
git commit -m "feat(admin): listar y aprobar solicitudes de Academia + contador"
```

---

### Task 9: `apps/admin` — hooks de solicitudes pendientes y de conteo

**Files:**
- Create: `apps/admin/src/features/academy/hooks/usePendingAcademyRequests.ts`
- Create: `apps/admin/src/features/academy/hooks/usePendingAcademyRequestsCount.ts`

**Interfaces:**
- Consumes: `listPendingRequestsByGroup`, `approveEnrollment`, `withdrawEnrollment`, `countPendingAcademyRequests` (Task 8).
- Produces: `usePendingAcademyRequests(groupId): { requests, loading, error, reload, approve, reject, markTrialAttended }` (Task 10); `usePendingAcademyRequestsCount(): { count, loading, reload }` (Task 11).

- [ ] **Step 1: Crear `usePendingAcademyRequests`**

```ts
// apps/admin/src/features/academy/hooks/usePendingAcademyRequests.ts
import { useCallback, useEffect, useState } from "react";
import {
  approveEnrollment,
  listPendingRequestsByGroup,
  withdrawEnrollment,
} from "../services/academyEnrollmentsService";
import type { AcademyEnrollmentWithStudent } from "../types/AcademyEnrollment";

export function usePendingAcademyRequests(groupId: string) {
  const [requests, setRequests] = useState<AcademyEnrollmentWithStudent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setRequests(await listPendingRequestsByGroup(groupId));
    } catch (err) {
      setError("No se pudieron cargar las solicitudes pendientes.");
      console.error("[academy] listPendingRequestsByGroup fallo", err);
    } finally {
      setLoading(false);
    }
  }, [groupId]);

  useEffect(() => {
    reload();
  }, [reload]);

  async function approve(id: string) {
    await approveEnrollment(id);
    await reload();
  }

  async function reject(id: string) {
    await withdrawEnrollment(id);
    await reload();
  }

  async function markTrialAttended(id: string) {
    await withdrawEnrollment(id);
    await reload();
  }

  return { requests, loading, error, reload, approve, reject, markTrialAttended };
}
```

- [ ] **Step 2: Crear `usePendingAcademyRequestsCount`**

```ts
// apps/admin/src/features/academy/hooks/usePendingAcademyRequestsCount.ts
import { useCallback, useEffect, useState } from "react";
import { countPendingAcademyRequests } from "../services/academyEnrollmentsService";

export function usePendingAcademyRequestsCount() {
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      setCount(await countPendingAcademyRequests());
    } catch (err) {
      console.error("[academy] countPendingAcademyRequests fallo", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  return { count, loading, reload };
}
```

- [ ] **Step 3: Typecheck**

Run: `npm run typecheck --workspace apps/admin`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add apps/admin/src/features/academy/hooks/usePendingAcademyRequests.ts apps/admin/src/features/academy/hooks/usePendingAcademyRequestsCount.ts
git commit -m "feat(admin): hooks de solicitudes pendientes y contador de Academia"
```

---

### Task 10: `apps/admin` — sección "Solicitudes pendientes" en `AcademyGroupDetailPage`

**Files:**
- Modify: `apps/admin/src/pages/AcademyGroupDetailPage.tsx`

**Interfaces:**
- Consumes: `usePendingAcademyRequests(groupId)` (Task 9), `getErrorMessage` (ya importado en el archivo).

- [ ] **Step 1: Agregar el import y el hook**

Junto a los imports existentes de `AcademyGroupDetailPage.tsx`:

```tsx
import { usePendingAcademyRequests } from '@/features/academy/hooks/usePendingAcademyRequests';
```

Dentro del componente, junto al resto de hooks (después de `useAcademyTuitionPeriod`):

```tsx
const {
  requests: pendingRequests,
  loading: pendingLoading,
  error: pendingError,
  approve,
  reject,
  markTrialAttended,
} = usePendingAcademyRequests(groupId);
const [pendingActionError, setPendingActionError] = useState<string | null>(null);
```

- [ ] **Step 2: Agregar los handlers**

Junto a `handleWithdraw`/`handleEnroll` existentes:

```tsx
async function handleApprove(id: string) {
  setPendingActionError(null);
  try {
    await approve(id);
  } catch (err) {
    setPendingActionError(getErrorMessage(err, 'No se pudo aprobar la solicitud.'));
    console.error('[academy] aprobar solicitud fallo', err);
  }
}

async function handleReject(id: string) {
  if (!window.confirm('Rechazar esta solicitud de inscripcion?')) return;
  setPendingActionError(null);
  try {
    await reject(id);
  } catch (err) {
    setPendingActionError(getErrorMessage(err, 'No se pudo rechazar la solicitud.'));
    console.error('[academy] rechazar solicitud fallo', err);
  }
}

async function handleMarkTrialAttended(id: string) {
  setPendingActionError(null);
  try {
    await markTrialAttended(id);
  } catch (err) {
    setPendingActionError(getErrorMessage(err, 'No se pudo marcar la clase muestra.'));
    console.error('[academy] marcar clase muestra fallo', err);
  }
}
```

- [ ] **Step 3: Agregar la sección JSX**

Insertar entre el bloque `{actionError && ...}` existente y el `<div className="mb-4 flex items-center justify-between">` que abre "Alumnos inscritos":

```tsx
{(pendingRequests.length > 0 || pendingLoading) && (
  <div className="mb-6">
    <h2 className="mb-2 text-lg font-semibold text-brand-primary">Solicitudes pendientes</h2>
    {pendingError && <p className="mb-2 text-sm text-red-600">{pendingError}</p>}
    {pendingActionError && <p className="mb-2 text-sm text-red-600">{pendingActionError}</p>}
    {pendingLoading ? (
      <p className="text-sm text-gray-500">Cargando...</p>
    ) : (
      <div id="academy-pending-requests-table" className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-gray-200 text-left text-gray-500">
              <th className="py-2">Alumno</th>
              <th className="py-2">Tipo</th>
              <th className="py-2">Inscripcion pagada</th>
              <th className="py-2">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {pendingRequests.map((request) => (
              <tr key={request.id} className="border-b border-gray-100">
                <td className="py-2">
                  <p className="font-medium text-gray-900">{request.studentName}</p>
                  <p className="text-xs text-gray-500">{request.guardianName ?? '-'}</p>
                </td>
                <td className="py-2 text-xs text-gray-600">
                  {request.status === 'PENDIENTE'
                    ? 'Inscripcion'
                    : `Clase muestra (${request.scheduleLabel ?? '-'}, ${request.trialDate ?? '-'})`}
                </td>
                <td className="py-2 text-xs">
                  {request.status === 'PENDIENTE'
                    ? request.registrationFeePaid
                      ? 'Si (pago de prueba)'
                      : 'No'
                    : '-'}
                </td>
                <td className="py-2">
                  <div className="flex items-center gap-3">
                    {request.status === 'PENDIENTE' ? (
                      <>
                        <button
                          type="button"
                          onClick={() => handleApprove(request.id)}
                          className="text-sm text-brand-primary hover:underline"
                        >
                          Aprobar
                        </button>
                        <button
                          type="button"
                          onClick={() => handleReject(request.id)}
                          className="text-sm text-red-600 hover:underline"
                        >
                          Rechazar
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleMarkTrialAttended(request.id)}
                        className="text-sm text-brand-primary hover:underline"
                      >
                        Marcar atendida
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )}
  </div>
)}
```

- [ ] **Step 4: Typecheck + lint**

Run: `npm run typecheck --workspace apps/admin && npm run lint --workspace apps/admin`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/admin/src/pages/AcademyGroupDetailPage.tsx
git commit -m "feat(admin): seccion Solicitudes pendientes en detalle de grupo de Academia"
```

---

### Task 11: `apps/admin` — badge de solicitudes nuevas en `HomePage` y `AcademiaHubPage`

**Files:**
- Modify: `apps/admin/src/pages/HomePage.tsx`
- Modify: `apps/admin/src/pages/AcademiaHubPage.tsx`

**Interfaces:**
- Consumes: `usePendingAcademyRequestsCount()` (Task 9).

- [ ] **Step 1: Agregar el badge en `HomePage.tsx`**

```tsx
// apps/admin/src/pages/HomePage.tsx
import { Link } from "react-router-dom";
import { useAuth } from "@/features/auth/hooks/AuthProvider";
import { usePendingAcademyRequestsCount } from "@/features/academy/hooks/usePendingAcademyRequestsCount";

const HUB_ITEMS = [
  { to: "/estudio", label: "Estudio", icon: "🧘" },
  { to: "/academia", label: "Academia", icon: "🩰" },
] as const;

export function HomePage() {
  const { profile } = useAuth();
  const { count: pendingAcademyCount } = usePendingAcademyRequestsCount();

  return (
    <div id="admin-dashboard" className="mx-auto max-w-2xl p-12">
      <h1 className="mb-1 text-2xl font-semibold text-brand-primary">Panel administrativo</h1>
      <p className="mb-8 text-sm text-gray-500">
        {profile?.fullName ?? "Bienvenido"} - Rol: {profile?.role}
      </p>
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        {HUB_ITEMS.map((item) => (
          <Link
            key={item.to}
            to={item.to}
            className="relative flex flex-col items-center justify-center gap-3 rounded-lg border border-gray-200 bg-white p-12 text-center shadow-sm hover:border-brand-primary hover:shadow-md"
          >
            {item.to === "/academia" && pendingAcademyCount > 0 && (
              <span className="absolute right-3 top-3 flex h-6 min-w-6 items-center justify-center rounded-full bg-red-600 px-1.5 text-xs font-semibold text-white">
                {pendingAcademyCount}
              </span>
            )}
            <span className="text-5xl">{item.icon}</span>
            <span className="text-xl font-semibold text-brand-primary">{item.label}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Agregar el aviso en `AcademiaHubPage.tsx`**

```tsx
// apps/admin/src/pages/AcademiaHubPage.tsx
import { Link } from "react-router-dom";
import { BackButton } from "@/components/ui/BackButton";
import { usePendingAcademyRequestsCount } from "@/features/academy/hooks/usePendingAcademyRequestsCount";

const ACADEMIA_ITEMS = [
  { to: "/academy/groups", label: "Ver horarios", icon: "📅" },
  { to: "/students", label: "Ver alumnos", icon: "🩰" },
];

export function AcademiaHubPage() {
  const { count: pendingCount } = usePendingAcademyRequestsCount();

  return (
    <div id="academia-hub-page" className="mx-auto max-w-3xl p-6">
      <BackButton />
      <h1 className="mb-2 text-xl font-semibold text-brand-primary">Academia</h1>
      {pendingCount > 0 && (
        <p className="mb-4 text-sm font-medium text-red-600">
          {pendingCount} solicitud{pendingCount === 1 ? "" : "es"} nueva{pendingCount === 1 ? "" : "s"} sin
          atender — revisa "Ver horarios" y entra al grupo correspondiente.
        </p>
      )}
      <div className="grid grid-cols-2 gap-4">
        {ACADEMIA_ITEMS.map((item) => (
          <Link
            key={item.to}
            to={item.to}
            className="flex flex-col items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white p-8 text-center shadow-sm hover:border-brand-primary hover:shadow-md"
          >
            <span className="text-4xl">{item.icon}</span>
            <span className="text-base font-medium text-brand-primary">{item.label}</span>
          </Link>
        ))}
      </div>
      <Link to="/academy/overdue" className="mt-4 inline-block text-sm text-gray-500 hover:underline">
        Ver colegiaturas atrasadas →
      </Link>
    </div>
  );
}
```

- [ ] **Step 3: Typecheck + lint + build**

Run: `npm run typecheck --workspace apps/admin && npm run lint --workspace apps/admin && npm run build --workspace apps/admin`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add apps/admin/src/pages/HomePage.tsx apps/admin/src/pages/AcademiaHubPage.tsx
git commit -m "feat(admin): badge de solicitudes nuevas de Academia en el dashboard"
```

---

### Task 12: QA manual end-to-end + build completo + docs

**Files:**
- Modify: `docs/CURRENT_STATE.md`
- Modify: `docs/roadmap.md`

**Interfaces:** Ninguna — tarea de verificación y documentación, cierre del plan.

- [ ] **Step 1: Build completo del monorepo**

Run: `npm run typecheck && npm run lint && npm run build`
Expected: PASS en ambas apps.

- [ ] **Step 2: QA manual en navegador — flujo del padre**

Con `npm run dev` en `apps/web` (usuario `CUSTOMER` autenticado):
1. Ir a `/academy`, elegir un grupo, clic en "Inscribir y pagar inscripción".
2. Sin alumnos aún: crear uno nuevo inline (nombre + fecha nacimiento) → confirmar que aparece seleccionado.
3. Clic en "Pagar inscripción e inscribir" → confirmar mensaje de éxito en la card y que el modal cierra.
4. Ir a `/profile` → confirmar que aparece en "Mis alumnos e inscripciones" con badge "Pendiente de aprobación".
5. Volver a `/academy`, mismo grupo, clic en "Agendar clase muestra" → elegir alumno + horario → confirmar mensaje de éxito.
6. `/profile` de nuevo → confirmar segunda fila con badge "Clase muestra solicitada".

- [ ] **Step 3: QA manual en navegador — flujo del staff**

Con `npm run dev` en `apps/admin` (usuario `STAFF`/`BUSINESS_ADMIN`):
1. En el dashboard (`/`), confirmar que la card "Academia" muestra el badge rojo con el conteo (2, de la Step 2).
2. Entrar a Academia → confirmar el aviso de "N solicitudes nuevas sin atender".
3. Entrar al grupo correspondiente (`/academy/groups/:id`) → confirmar la sección "Solicitudes pendientes" con las 2 filas (inscripción + clase muestra) del padre de prueba.
4. Clic "Aprobar" en la solicitud de inscripción → confirmar que desaparece de pendientes y aparece en "Alumnos inscritos".
5. Clic "Marcar atendida" en la clase muestra → confirmar que desaparece de pendientes.
6. Volver al dashboard → confirmar que el badge ya no aparece (conteo en 0).

- [ ] **Step 4: Probar el caso de rechazo y el de cupo lleno**

1. Crear otra solicitud de inscripción de prueba, esta vez clic "Rechazar" → confirmar que desaparece de pendientes y NO aparece en "Alumnos inscritos".
2. Si el grupo de prueba tiene `max_capacity` bajo, llenarlo y crear una solicitud extra → al "Aprobar", confirmar que se muestra el error de cupo lleno que lanza el trigger `enforce_academy_enrollment_capacity_and_age` (023) en vez de fallar en silencio.

- [ ] **Step 5: Actualizar `docs/CURRENT_STATE.md`**

En la sección `## Funcionalidades implementadas en apps/web (Cliente)` (línea ~606), reemplazar la línea de Academia:

```
- **Academia** (`/academy`): catálogo público de grupos (instructor, rango de edad, horario) con botón "Inscribir por WhatsApp" por grupo; sin inscripción real todavía (ver "Next Task").
```

por:

```
- **Academia** (`/academy`): catálogo público de grupos con inscripción propia — "Inscribir y pagar inscripción" (crea alumno inline si hace falta, INSERT con `status='PENDIENTE'` y cuota de inscripción marcada como pagada — **pago dummy, sin Stripe todavía**) y "Agendar clase muestra" (`status='MUESTRA'`, sin costo); WhatsApp queda como alternativa secundaria. `/profile` gana la sección "Mis alumnos e inscripciones" con el estado de cada solicitud.
```

En la sección `## Migraciones existentes` (después de la entrada de `026_academy_groups_public_read.sql`, línea ~777), agregar:

```
- `027_academy_self_enrollment.sql` — estados `PENDIENTE`/`MUESTRA` en `academy_enrollments`,
  columnas `schedule_id`/`trial_date`/`registration_fee_paid`/`registration_fee_paid_at`,
  `business.academy_registration_fee_cents`, y RLS de autoservicio para `dependents` y
  `academy_enrollments` (`CUSTOMER` inserta solo `PENDIENTE`/`MUESTRA` para sus propios alumnos,
  nunca `ACTIVA` directo). Primera vez que un cliente puede inscribir a su hijo sin pasar por
  staff, con aprobación de staff como paso obligatorio antes de `ACTIVA`.
```

Actualizar también el número de tablas/migraciones si la sección `## Integraciones configuradas` (línea ~618) menciona un rango desactualizado (revisar el texto actual antes de editarlo, puede ya estar corregido por un commit posterior a este plan).

Agregar a `## Funcionalidades implementadas` (`apps/admin`, sección correspondiente a Academia, buscar el bloque existente de "Academia" con `grep -n "Academia" docs/CURRENT_STATE.md` antes de editar) una línea nueva:

```
Sección "Solicitudes pendientes" en el detalle de grupo (`/academy/groups/:id`) con
Aprobar/Rechazar/Marcar atendida sobre solicitudes `PENDIENTE`/`MUESTRA`; badge de conteo en el
dashboard y en el hub de Academia.
```

- [ ] **Step 6: Actualizar `docs/roadmap.md`**

Reemplazar el bloque `18f` (líneas 53-60):

```
    18f. **Academia — Inscripción propia en `apps_web` (self-service).**
         Catálogo público de grupos + botón "Inscribir por WhatsApp" ya
         implementado (2026-09-07, migración `026_academy_groups_public_read.sql`).
         Pendiente: solicitud de inscripción real (estado `PENDIENTE`,
         requiere aprobación de staff) + alta de alumno inline + cobro
         automático de colegiatura conectado solo cuando la etapa 14
         (Stripe) esté lista. Ver spec completo:
         `docs/superpowers/specs/2026-09-07-academy-web-self-enrollment-design.md`.
```

por:

```
    18f. **Academia — Inscripción propia en `apps/web` (self-service).**
         Implementado (2026-09-09, migración `027_academy_self_enrollment.sql`):
         solicitud de inscripción real (`PENDIENTE`, requiere aprobación de
         staff), alta de alumno inline, clase muestra (`MUESTRA`), cuota de
         inscripción con botón de pago **dummy** (sin Stripe todavía), y
         badge de solicitudes nuevas para el staff en `apps/admin`. Pendiente
         real: conectar el cobro de inscripción y de colegiatura a Stripe
         Checkout cuando la etapa 14 esté lista (ver "Cobro automático" en
         el spec). Spec completo:
         `docs/superpowers/specs/2026-09-09-academy-self-enrollment-and-admin-visibility-design.md`.
```

- [ ] **Step 7: Commit final**

```bash
git add docs/CURRENT_STATE.md docs/roadmap.md
git commit -m "docs: actualizar CURRENT_STATE y roadmap con autoservicio de Academia"
```

---

## Después de este plan

Con las 12 tareas completas, abrir el Pull Request de `feat/academy-self-enrollment` hacia `develop` (nunca a `main` directo, ver `docs/git-workflow.md`) — pero **solo cuando el usuario lo pida explícitamente**, igual que en el resto de este repo.
