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
