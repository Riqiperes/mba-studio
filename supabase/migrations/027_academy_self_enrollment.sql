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
