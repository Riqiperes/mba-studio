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