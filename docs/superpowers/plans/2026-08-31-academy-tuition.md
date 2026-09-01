# Academia — Colegiaturas Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permitir al staff marcar manualmente el estado de cada colegiatura mensual (`PAGADO`/`NO_PAGADO`) por inscripción, con monto, método de pago, referencia opcional y fecha; y visualizar alertas de pagos atrasados.

**Architecture:** Feature-First (`apps/admin/src/features/academy/`), mismo patrón `Page → componente → hook → service → Supabase`. Sin funciones RPC: RLS normal staff-scoped.

**Tech Stack:** React + Vite + TypeScript strict, Tailwind CSS v4, Supabase (Postgres + RLS + supabase-js tipado), Zod, React Router v6.

**Spec:** `docs/superpowers/specs/2026-08-31-academy-tuition-design.md`

---

## Global Constraints

- `"exactOptionalPropertyTypes": true` en `tsconfig.base.json` — tipado estructural y condicional.
- Todo `<form>` usa `noValidate`. Modales cierran con tecla Escape.
- Manejo de errores: usa `apps/admin/src/utils/getErrorMessage.ts`.
- No romper flujos existentes de inscripciones y grupos.
- Decisiones de negocio previas: día fijo global (ej. día 5) para corte de colegiatura; columna `reference` opcional en pagos.

---

### Task 1: Migración de base de datos y regenerar tipos

**Files:**
- Create: `supabase/migrations/014_academy_tuition.sql`
- Modify: `apps/admin/src/lib/database.types.ts`
- Modify: `apps/web/src/lib/database.types.ts`

**Interfaces:**
- Produces: tablas `academy_tuition_periods`, `academy_payments` con RLS staff-scoped.

- [ ] **Step 1: Crear el archivo de migración**

```sql
-- supabase/migrations/014_academy_tuition.sql
-- Colegiaturas de Academia: periodos por grupo y pagos por inscripción

-- 1. Periodos de colegiatura por grupo (configuración de cuándo se cobra)
create table public.academy_tuition_periods (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.business (id),
  group_id uuid not null references public.academy_groups (id) on delete cascade,
  -- Si day_of_month = null -> usa aniversario de enrollment_date del alumno
  -- Si day_of_month = 5 -> todos pagan el día 5 de cada mes
  day_of_month smallint check (day_of_month between 1 and 28),
  amount_cents integer not null check (amount_cents > 0),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index academy_tuition_periods_group_id_idx
  on public.academy_tuition_periods (group_id);

-- 2. Pagos de colegiatura (uno por enrollment_id + periodo)
create table public.academy_payments (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.business (id),
  enrollment_id uuid not null references public.academy_enrollments (id) on delete cascade,
  period_start date not null,
  period_end date not null,
  status text not null default 'NO_PAGADO' check (status in ('PAGADO', 'NO_PAGADO')),
  amount_cents integer not null check (amount_cents > 0),
  paid_at timestamptz,
  payment_method text check (payment_method in ('EFECTIVO', 'TRANSFERENCIA', 'OTRO')),
  reference text, -- folio/referencia opcional
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Un solo pago por enrollment + periodo (period_start identifica el mes)
  constraint academy_payments_enrollment_period_unique
    unique (enrollment_id, period_start)
);
create index academy_payments_enrollment_id_idx
  on public.academy_payments (enrollment_id);
create index academy_payments_status_period_end_idx
  on public.academy_payments (status, period_end)
  where status = 'NO_PAGADO';

-- 3. RLS
alter table public.academy_tuition_periods enable row level security;
create policy "academy_tuition_periods_manage_staff"
  on public.academy_tuition_periods for all
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

alter table public.academy_payments enable row level security;
create policy "academy_payments_manage_staff"
  on public.academy_payments for all
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

- [ ] **Step 2: Aplicar la migración en el proyecto de Supabase**

Usa `apply_migration` o SQL Editor con `name: "014_academy_tuition"`.

- [ ] **Step 3: Regenerar tipos TypeScript**

Regenera `apps/admin/src/lib/database.types.ts` y `apps/web/src/lib/database.types.ts`.

- [ ] **Step 4: Typecheck**

Run: `npm run typecheck --workspace=apps/admin && npm run typecheck --workspace=apps/web`
Expected: sin errores.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/014_academy_tuition.sql apps/admin/src/lib/database.types.ts apps/web/src/lib/database.types.ts
git commit -m "feat(db): tablas de colegiaturas (periodos y pagos) para academia"
```

---

### Task 2: Tipos y servicio de colegiaturas

**Files:**
- Create: `apps/admin/src/features/academy/types/TuitionPeriod.ts`
- Create: `apps/admin/src/features/academy/types/AcademyPayment.ts`
- Create: `apps/admin/src/features/academy/services/academyTuitionService.ts`

**Interfaces:**
- Produces: `TuitionPeriod`, `AcademyPayment`, `PaymentInput`, `OverduePayment`.
- Produces: `listTuitionPeriodsByGroup(groupId)`, `upsertTuitionPeriod`, `listPaymentsByEnrollment(enrollmentId)`, `upsertPayment(enrollmentId, input)`, `getOverduePayments(businessId, groupId?)`.

- [ ] **Step 1: Crear `features/academy/types/TuitionPeriod.ts`**

```typescript
export type TuitionPeriod = {
  id: string;
  businessId: string;
  groupId: string;
  dayOfMonth: number | null; // null = aniversario de inscripción
  amountCents: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
};

export type TuitionPeriodInput = {
  groupId: string;
  dayOfMonth: number | null;
  amountCents: number;
  active?: boolean;
};
```

- [ ] **Step 2: Crear `features/academy/types/AcademyPayment.ts`**

```typescript
export type PaymentStatus = 'PAGADO' | 'NO_PAGADO';
export type PaymentMethod = 'EFECTIVO' | 'TRANSFERENCIA' | 'OTRO';

export type AcademyPayment = {
  id: string;
  businessId: string;
  enrollmentId: string;
  periodStart: string; // date
  periodEnd: string;   // date
  status: PaymentStatus;
  amountCents: number;
  paidAt: string | null;
  paymentMethod: PaymentMethod | null;
  reference: string | null;
  createdAt: string;
  updatedAt: string;
};

export type AcademyPaymentWithEnrollment = AcademyPayment & {
  enrollment: {
    id: string;
    dependentId: string;
    groupId: string;
    dependent: {
      fullName: string;
      guardianName: string | null;
      guardianPhone: string | null;
    };
    group: {
      name: string;
    };
  };
};

export type PaymentInput = {
  periodStart: string; // date
  periodEnd: string;   // date
  status: PaymentStatus;
  amountCents: number;
  paidAt?: string | null;       // requerido si status = PAGADO
  paymentMethod?: PaymentMethod | null; // requerido si status = PAGADO
  reference?: string | null;
};

export type OverduePayment = AcademyPaymentWithEnrollment & {
  daysOverdue: number;
};
```

- [ ] **Step 3: Crear `features/academy/services/academyTuitionService.ts`**

```typescript
import { supabaseAdmin } from '@/lib/supabaseClient';
import type { TuitionPeriod, TuitionPeriodInput, AcademyPayment, PaymentInput, OverduePayment, AcademyPaymentWithEnrollment } from '../types';

const TUITION_PERIOD_SELECT = `
  id, business_id, group_id, day_of_month, amount_cents, active,
  created_at, updated_at
`;

const PAYMENT_SELECT = `
  id, business_id, enrollment_id, period_start, period_end, status,
  amount_cents, paid_at, payment_method, reference,
  created_at, updated_at
`;

function toTuitionPeriod(row: any): TuitionPeriod {
  return {
    id: row.id,
    businessId: row.business_id,
    groupId: row.group_id,
    dayOfMonth: row.day_of_month,
    amountCents: row.amount_cents,
    active: row.active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toPayment(row: any): AcademyPayment {
  return {
    id: row.id,
    businessId: row.business_id,
    enrollmentId: row.enrollment_id,
    periodStart: row.period_start,
    periodEnd: row.period_end,
    status: row.status,
    amountCents: row.amount_cents,
    paidAt: row.paid_at,
    paymentMethod: row.payment_method,
    reference: row.reference,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function listTuitionPeriodsByGroup(groupId: string): Promise<TuitionPeriod[]> {
  const { data, error } = await supabaseAdmin
    .from('academy_tuition_periods')
    .select(TUITION_PERIOD_SELECT)
    .eq('group_id', groupId)
    .eq('active', true)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map(toTuitionPeriod);
}

export async function upsertTuitionPeriod(input: TuitionPeriodInput): Promise<TuitionPeriod> {
  const businessId = (await supabaseAdmin.rpc('current_user_business_id')).data;
  const payload = {
    business_id: businessId,
    group_id: input.groupId,
    day_of_month: input.dayOfMonth,
    amount_cents: input.amountCents,
    active: input.active ?? true,
  };
  const { data, error } = await supabaseAdmin
    .from('academy_tuition_periods')
    .upsert(payload, { onConflict: 'group_id' })
    .select(TUITION_PERIOD_SELECT)
    .single();
  if (error) throw error;
  return toTuitionPeriod(data);
}

export async function listPaymentsByEnrollment(enrollmentId: string): Promise<AcademyPayment[]> {
  const { data, error } = await supabaseAdmin
    .from('academy_payments')
    .select(PAYMENT_SELECT)
    .eq('enrollment_id', enrollmentId)
    .order('period_start', { ascending: false });
  if (error) throw error;
  return (data ?? []).map(toPayment);
}

export async function upsertPayment(enrollmentId: string, input: PaymentInput): Promise<AcademyPayment> {
  const businessId = (await supabaseAdmin.rpc('current_user_business_id')).data;
  const payload = {
    business_id: businessId,
    enrollment_id: enrollmentId,
    period_start: input.periodStart,
    period_end: input.periodEnd,
    status: input.status,
    amount_cents: input.amountCents,
    paid_at: input.paidAt ?? null,
    payment_method: input.paymentMethod ?? null,
    reference: input.reference ?? null,
  };
  const { data, error } = await supabaseAdmin
    .from('academy_payments')
    .upsert(payload, { onConflict: 'enrollment_id,period_start' })
    .select(PAYMENT_SELECT)
    .single();
  if (error) throw error;
  return toPayment(data);
}

export async function getOverduePayments(businessId: string, groupId?: string): Promise<OverduePayment[]> {
  const today = new Date().toISOString().split('T')[0];
  let query = supabaseAdmin
    .from('academy_payments')
    .select(`
      ${PAYMENT_SELECT},
      enrollment:academy_enrollments!inner(
        id, dependent_id, group_id,
        dependent:dependents!inner(full_name, guardian_name, guardian_phone),
        group:academy_groups!inner(name)
      )
    `)
    .eq('business_id', businessId)
    .eq('status', 'NO_PAGADO')
    .lt('period_end', today)
    .order('period_end', { ascending: true });
  if (groupId) {
    query = query.eq('enrollment.group_id', groupId);
  }
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []).map((row: any) => {
    const payment = toPayment(row);
    const periodEnd = new Date(row.period_end);
    const todayDate = new Date(today);
    const daysOverdue = Math.floor((todayDate.getTime() - periodEnd.getTime()) / (1000 * 60 * 60 * 24));
    return {
      ...payment,
      enrollment: row.enrollment,
      daysOverdue,
    } as OverduePayment;
  });
}
```

- [ ] **Step 4: Typecheck**

Run: `npm run typecheck --workspace=apps/admin`
Expected: sin errores.

- [ ] **Step 5: Commit**

```bash
git add apps/admin/src/features/academy/types apps/admin/src/features/academy/services/academyTuitionService.ts
git commit -m "feat(admin): tipos y servicio de colegiaturas (periodos y pagos)"
```

---

### Task 3: Componentes UI — Badge y Modal de pago

**Files:**
- Create: `apps/admin/src/features/academy/components/TuitionStatusBadge.tsx`
- Create: `apps/admin/src/features/academy/components/MarkPaymentModal.tsx`

**Interfaces:**
- Produces: `TuitionStatusBadge` (props: `status: 'PAGADO' | 'NO_PAGADO'`) — pill verde/rojo.
- Produces: `MarkPaymentModal` (props: `enrollmentId`, `onClose`, `onSuccess`, `initialPayment?`) — formulario Zod para marcar PAGADO/NO_PAGADO.

- [ ] **Step 1: Crear `TuitionStatusBadge.tsx`**

```tsx
import { Badge } from '@/components/ui/Badge';

interface Props {
  status: 'PAGADO' | 'NO_PAGADO';
}

export function TuitionStatusBadge({ status }: Props) {
  return (
    <Badge variant={status === 'PAGADO' ? 'success' : 'destructive'}>
      {status}
    </Badge>
  );
}
```

- [ ] **Step 2: Crear `MarkPaymentModal.tsx`**

Modal con:
- Select de periodo (periodStart + periodEnd formateado "Ene 2026", "Feb 2026", etc.).
- Radio/Select para `status` (`PAGADO` / `NO_PAGADO`).
- Si `PAGADO`: campos obligatorios `amountCents` (number, pesos enteros → cents), `paymentMethod` (select EFECTIVO/TRANSFERENCIA/OTRO), `paidAt` (date, default hoy), `reference` (text opcional).
- Si `NO_PAGADO`: solo confirma, limpia `paidAt`, `paymentMethod`, `reference`.
- Zod schema con refinamiento: si status = PAGADO, paidAt/paymentMethod/amountCents requeridos.
- `noValidate`, cierre con Escape, `getErrorMessage` para errores.

- [ ] **Step 3: Typecheck, lint y build**

Run: `npm run typecheck --workspace=apps/admin && npm run lint --workspace=apps/admin && npm run build --workspace=apps/admin`

- [ ] **Step 4: Commit**

```bash
git add apps/admin/src/features/academy/components/TuitionStatusBadge.tsx apps/admin/src/features/academy/components/MarkPaymentModal.tsx
git commit -m "feat(admin): componentes UI de colegiaturas (badge y modal de pago)"
```

---

### Task 4: Integrar en detalle de grupo y vista de atrasados

**Files:**
- Modify: `apps/admin/src/pages/AcademyGroupDetailPage.tsx`
- Create: `apps/admin/src/pages/AcademyOverduePage.tsx`
- Modify: `apps/admin/src/pages/HomePage.tsx`
- Modify: `apps/admin/src/components/AdminLayout.tsx`

**Interfaces:**
- Produces: Columna "Colegiatura" en tabla de inscritos con `TuitionStatusBadge` y botón "Marcar pago" → `MarkPaymentModal`.
- Produces: Página `/academy/overdue` con tabla de pagos atrasados, filtro por grupo, botón "Marcar pagado" inline.
- Produces: Link "Colegiaturas" en `AdminLayout` nav y botón en grid de `HomePage`.

- [ ] **Step 1: Actualizar `AcademyGroupDetailPage.tsx`**

- Importar `listPaymentsByEnrollment`, `getOverduePayments` (o calcular periodo actual en frontend), `TuitionStatusBadge`, `MarkPaymentModal`.
- Para cada inscripción activa, determinar el periodo actual (basado en `dayOfMonth` del grupo y `enrollment_date` o fecha fija).
- Mostrar badge del estado de ese periodo.
- Botón "Marcar pago" abre modal con el periodo actual preseleccionado.
- Al cerrar modal con éxito, refrescar lista.

- [ ] **Step 2: Crear `AcademyOverduePage.tsx`**

- `useOverduePayments` hook que llama a `getOverduePayments(businessId, groupId?)`.
- Tabla con columnas: Alumno, Grupo, Tutor, Teléfono, Periodo (formateado), Monto, Días atraso, Acción.
- Select de filtro por grupo (usa `useAcademyGroups`).
- Botón "Marcar pagado" por fila → abre `MarkPaymentModal` con datos precargados.
- Paginación simple (limit 50).

- [ ] **Step 3: Actualizar `AdminLayout.tsx` y `HomePage.tsx`**

- Agregar link "Colegiaturas" en nav (href `/academy/overdue`).
- Agregar botón "Colegiaturas atrasadas" en grid de `HomePage`.

- [ ] **Step 4: Typecheck, lint y build**

Run: `npm run typecheck --workspace=apps/admin && npm run lint --workspace=apps/admin && npm run build --workspace=apps/admin`

- [ ] **Step 5: Commit**

```bash
git add apps/admin/src/pages/AcademyGroupDetailPage.tsx apps/admin/src/pages/AcademyOverduePage.tsx apps/admin/src/pages/HomePage.tsx apps/admin/src/components/AdminLayout.tsx
git commit -m "feat(admin): detalle de grupo con colegiatura y vista de pagos atrasados"
```

---

### Task 5: Verificación end-to-end y documentación

**Files:**
- Modify: `docs/CURRENT_STATE.md`

**Interfaces:**
- Consumes: Todas las funcionalidades de las Tasks 1-4.

- [ ] **Step 1: Verificación manual end-to-end (Checklist del spec)**

1. Configurar periodo de colegiatura para un grupo (día fijo 5, monto $X) → se guarda.
2. Inscribir alumno (o usar existente) → periodo actual aparece como `NO_PAGADO`.
3. En `/academy/groups/:id` → columna "Colegiatura" muestra badge rojo `NO_PAGADO`.
4. Click "Marcar pago" → llenar monto, método `EFECTIVO`, referencia opcional, fecha hoy → guardar → badge verde `PAGADO`.
5. En `/academy/overdue` → aparece alumno con pago atrasado (period_end < hoy, status NO_PAGADO).
6. En `/academy/overdue` → "Marcar pagado" → sale de la lista de atrasados.
7. Filtro por grupo en `/academy/overdue` funciona.
8. Tecla Escape cierra todos los modales.
9. Navegación: link en AdminLayout y botón en HomePage llevan a `/academy/overdue`.

- [ ] **Step 2: Actualizar `docs/CURRENT_STATE.md`**

Documentar migración 014, colegiaturas en Academia, vista de atrasados, y actualizar el roadmap: Academia completada (no hay sub-proyecto 18d — Asistencia descartado por orden de la directora).

- [ ] **Step 3: Commit**

```bash
git add docs/CURRENT_STATE.md
git commit -m "docs: colegiaturas en academia completado, academia terminada (asistencia descartada)"
```

---

### Task 6: Push y Pull Request

- [ ] Push rama `feat/admin-academy-tuition` a origin.
- [ ] Abrir PR hacia `develop` con título "feat(admin): Academia — Colegiaturas".
- [ ] Mergear tras revisión.
- [ ] Limpiar worktree y rama local/remota.