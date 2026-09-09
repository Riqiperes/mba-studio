-- supabase/migrations/028_academy_self_enrollment_constraints.sql
-- Hardening de 027 (autoservicio de inscripcion de Academia), encontrado en
-- code review final antes de merge de feat/academy-self-enrollment:
--
-- 1. academy_enrollments_active_unique (012) solo cubria status = 'ACTIVA',
--    dejando que un padre mande la misma solicitud varias veces (N filas
--    PENDIENTE) o una PENDIENTE nueva para un alumno ya ACTIVA en ese grupo
--    (que entonces falla con un unique-violation crudo hasta que staff
--    intenta aprobarla). Se amplia el predicado para cubrir tambien
--    PENDIENTE.
-- 2. dependents_customer_insert_own y academy_enrollments_customer_insert_own
--    (027) validan ownership y status pero nunca fijan business_id al
--    negocio del cliente que llama -- un insert manipulado podria escribir
--    un business_id arbitrario. Se agrega
--    business_id = public.current_user_business_id() al with check de
--    ambas.

-- 1. Ampliar el unique index de academy_enrollments a ACTIVA + PENDIENTE.
drop index if exists public.academy_enrollments_active_unique;
create unique index academy_enrollments_active_unique
  on public.academy_enrollments (dependent_id, group_id)
  where status in ('ACTIVA', 'PENDIENTE');

-- 2. Pinnear business_id en las policies de insert de autoservicio (027).
drop policy if exists "dependents_customer_insert_own" on public.dependents;
create policy "dependents_customer_insert_own"
  on public.dependents
  for insert
  with check (
    guardian_id = auth.uid()
    and business_id = public.current_user_business_id()
  );

drop policy if exists "academy_enrollments_customer_insert_own" on public.academy_enrollments;
create policy "academy_enrollments_customer_insert_own"
  on public.academy_enrollments
  for insert
  with check (
    status in ('PENDIENTE', 'MUESTRA')
    and business_id = public.current_user_business_id()
    and exists (
      select 1 from public.dependents d
      where d.id = dependent_id and d.guardian_id = auth.uid()
    )
  );
