-- supabase/migrations/016_comprehensive_features.sql
-- Migracion consolidada para todas las nuevas funcionalidades (2026-09-02)
-- Incluye:
-- 1. Politica de cancelacion 12h + reset mensual creditos
-- 2. Waitlist solo recordatorio (tabla notificaciones)
-- 3. Colegiaturas dia 10 (ajuste day_of_month)
-- 4. Descuentos por referido (discount_percent en profiles)
-- 5. Campos medicos en dependents
-- 6. Rol INSTRUCTOR_ADMIN + vinculo profile-instructor
-- 7. Academy groups: edad + cupo max 15
-- 8. RLS para instructor_admin

-- ============================================================
-- 1. CANCELACION 12H + RESET MENSUAL CREDITOS
-- ============================================================

-- Tabla bookings: tracking de cancelacion y refund
alter table public.bookings
  add column if not exists cancelled_at timestamptz,
  add column if not exists refunded boolean not null default false;

-- Tipo credit_reason: agregar nuevas razones (si es enum)
-- Nota: si credit_reason es check constraint, recrear
do $$
begin
  -- Verificar si customer_credits_ledger tiene check constraint en reason
  if exists (
    select 1 from information_schema.check_constraints
    where constraint_name = 'customer_credits_ledger_reason_check'
  ) then
    -- Recrear check constraint con nuevos valores
    alter table public.customer_credits_ledger
      drop constraint customer_credits_ledger_reason_check;
    
    alter table public.customer_credits_ledger
      add constraint customer_credits_ledger_reason_check
      check (reason in (
        'MANUAL_GRANT', 'PACKAGE_GRANT', 'BOOKING_CONSUMED', 
        'BOOKING_REFUNDED', 'BOOKING_CANCELLED_LATE', 'MONTHLY_EXPIRATION'
      ));
  end if;
end $$;

-- Indice para reset mensual
create index if not exists customer_credits_ledger_customer_created_idx
  on public.customer_credits_ledger (customer_id, created_at);

-- ============================================================
-- 2. WAITLIST - SOLO RECORDATORIO (TABLA NOTIFICACIONES)
-- ============================================================

create table if not exists public.waitlist_notifications (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.business (id),
  waitlist_id uuid not null references public.waitlist (id) on delete cascade,
  class_id uuid not null references public.studio_classes (id),
  customer_id uuid not null references public.profiles (id),
  sent_by uuid references public.profiles (id),
  channel text not null check (channel in ('WHATSAPP', 'EMAIL', 'MOCK')),
  sent_at timestamptz not null default now(),
  status text not null default 'SENT' check (status in ('SENT', 'FAILED')),
  error_message text
);
create index if not exists waitlist_notifications_waitlist_idx
  on public.waitlist_notifications (waitlist_id);
create index if not exists waitlist_notifications_class_idx
  on public.waitlist_notifications (class_id);

-- RLS waitlist_notifications
alter table public.waitlist_notifications enable row level security;

drop policy if exists "waitlist_notifications_manage_staff" on public.waitlist_notifications;
create policy "waitlist_notifications_manage_staff"
  on public.waitlist_notifications for all
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

-- ============================================================
-- 3. COLEGIATURAS - DIA 10 FIJO (ya existe day_of_month, solo documentacion)
-- ============================================================
-- No hay cambios de esquema: academy_tuition_periods.day_of_month ya permite 10
-- Solo configuracion inicial en seed: day_of_month = 10

-- ============================================================
-- 4. DESCUENTOS POR REFERIDO
-- ============================================================

alter table public.profiles
  add column if not exists discount_percent integer not null default 0
  check (discount_percent >= 0 and discount_percent <= 100);

comment on column public.profiles.discount_percent is
  'Descuento porcentual por referido, aplicable solo a colegiaturas de Academia/Ballet (0-100)';

-- En academy_payments: auditoria de descuento aplicado
alter table public.academy_payments
  add column if not exists discount_applied integer not null default 0
  check (discount_applied >= 0 and discount_applied <= 100);

-- ============================================================
-- 5. CAMPOS MEDICOS EN DEPENDENTS
-- ============================================================

alter table public.dependents
  add column if not exists medical_conditions text,
  add column if not exists age integer check (age >= 0 and age <= 120),
  add column if not exists notes text;

comment on column public.dependents.medical_conditions is
  'Condiciones medicas relevantes para la practica (embarazo, hernia, lesiones, etc.)';
comment on column public.dependents.age is
  'Edad del alumno (para grupos por edad en Academia)';
comment on column public.dependents.notes is
  'Notas libres del instructor/staff sobre el alumno';

-- ============================================================
-- 6. ROL INSTRUCTOR_ADMIN + VINCULO PROFILE-INSTRUCTOR
-- ============================================================

-- Agregar rol INSTRUCTOR_ADMIN
do $$
begin
  if not exists (
    select 1 from pg_enum where enumlabel = 'INSTRUCTOR_ADMIN' and enumtypid = 'public.user_role'::regtype
  ) then
    alter type public.user_role add value 'INSTRUCTOR_ADMIN';
  end if;
end $$;

-- Vincular profile con instructor (para login de instructor)
alter table public.profiles
  add column if not exists instructor_id uuid references public.instructors (id);

create index if not exists profiles_instructor_id_idx
  on public.profiles (instructor_id);

-- ============================================================
-- 7. ACADEMY GROUPS: EDAD + CUPO MAX 15
-- ============================================================

alter table public.academy_groups
  add column if not exists age_min smallint check (age_min >= 0),
  add column if not exists age_max smallint check (age_max >= 0 and age_max >= age_min),
  add column if not exists max_capacity smallint not null default 15 check (max_capacity <= 15);

comment on column public.academy_groups.age_min is 'Edad minima para inscribirse (opcional)';
comment on column public.academy_groups.age_max is 'Edad maxima para inscribirse (opcional)';
comment on column public.academy_groups.max_capacity is 'Cupo maximo de alumnos (max 15, recomendado 12)';

-- Enforcement server-side de cupo y edad. academy_enrollments no tiene RPC
-- propia (012_academy_groups.sql: "sin funciones RPC... sin cupo maximo
-- todavia", ya no aplica ahora que existe max_capacity/age_min/age_max) y
-- se escribe via insert directo desde apps/admin (academyEnrollmentsService
-- .enrollStudent), asi que sin este trigger el limite de cupo/edad solo
-- viviria en la validacion de UI -- CLAUDE.md/business-rules.md exigen que
-- las reglas de negocio nunca dependan solo del frontend.
create or replace function public.enforce_academy_enrollment_capacity_and_age()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_group public.academy_groups;
  v_active_count integer;
  v_age integer;
begin
  if new.status is distinct from 'ACTIVA' then
    return new;
  end if;

  select * into v_group from public.academy_groups where id = new.group_id;
  if not found then
    raise exception 'Grupo no encontrado';
  end if;

  select count(*) into v_active_count
  from public.academy_enrollments
  where group_id = new.group_id and status = 'ACTIVA' and id is distinct from new.id;

  if v_active_count >= v_group.max_capacity then
    raise exception 'El grupo ya alcanzo su cupo maximo (% alumnos)', v_group.max_capacity;
  end if;

  select age into v_age from public.dependents where id = new.dependent_id;

  if v_group.age_min is not null and v_age is not null and v_age < v_group.age_min then
    raise exception 'El alumno no cumple la edad minima del grupo (% anos)', v_group.age_min;
  end if;
  if v_group.age_max is not null and v_age is not null and v_age > v_group.age_max then
    raise exception 'El alumno supera la edad maxima del grupo (% anos)', v_group.age_max;
  end if;

  return new;
end;
$$;

drop trigger if exists academy_enrollments_enforce_capacity_and_age on public.academy_enrollments;
create trigger academy_enrollments_enforce_capacity_and_age
  before insert or update on public.academy_enrollments
  for each row execute function public.enforce_academy_enrollment_capacity_and_age();

-- ============================================================
-- 8. RLS PARA INSTRUCTOR_ADMIN
-- ============================================================

-- studio_classes: instructor ve solo sus clases
drop policy if exists "studio_classes_instructor_own_select" on public.studio_classes;
create policy "studio_classes_instructor_own_select"
  on public.studio_classes for select
  using (
    public.current_user_role() = 'INSTRUCTOR_ADMIN'
    and instructor_id = (
      select instructor_id from public.profiles where id = auth.uid()
    )
  );

-- bookings: instructor ve reservaciones de sus clases
drop policy if exists "bookings_instructor_own_select" on public.bookings;
create policy "bookings_instructor_own_select"
  on public.bookings for select
  using (
    public.current_user_role() = 'INSTRUCTOR_ADMIN'
    and class_id in (
      select id from public.studio_classes
      where instructor_id = (
        select instructor_id from public.profiles where id = auth.uid()
      )
    )
  );

-- waitlist: instructor ve waitlist de sus clases
drop policy if exists "waitlist_instructor_own_select" on public.waitlist;
create policy "waitlist_instructor_own_select"
  on public.waitlist for select
  using (
    public.current_user_role() = 'INSTRUCTOR_ADMIN'
    and class_id in (
      select id from public.studio_classes
      where instructor_id = (
        select instructor_id from public.profiles where id = auth.uid()
      )
    )
  );

-- dependents (alumnos): instructor ve alumnos de sus clases
drop policy if exists "dependents_instructor_own_select" on public.dependents;
create policy "dependents_instructor_own_select"
  on public.dependents for select
  using (
    public.current_user_role() = 'INSTRUCTOR_ADMIN'
    and id in (
      select distinct b.customer_id
      from public.bookings b
      join public.studio_classes c on b.class_id = c.id
      where c.instructor_id = (
        select instructor_id from public.profiles where id = auth.uid()
      )
      and b.status = 'CONFIRMED'
      union
      select distinct w.customer_id
      from public.waitlist w
      join public.studio_classes c on w.class_id = c.id
      where c.instructor_id = (
        select instructor_id from public.profiles where id = auth.uid()
      )
    )
  );

-- academy_enrollments: instructor ve inscripciones de sus grupos (si es instructor de academia)
drop policy if exists "academy_enrollments_instructor_own_select" on public.academy_enrollments;
create policy "academy_enrollments_instructor_own_select"
  on public.academy_enrollments for select
  using (
    public.current_user_role() = 'INSTRUCTOR_ADMIN'
    and group_id in (
      select id from public.academy_groups
      where instructor_id = (
        select instructor_id from public.profiles where id = auth.uid()
      )
    )
  );

-- Actualizar RequireAuth en admin para permitir INSTRUCTOR_ADMIN
-- (se hace en codigo frontend, no en BD)

-- ============================================================
-- FUNCIONES RPC ACTUALIZADAS
-- ============================================================

-- 1. cancel_booking actualizado con ventana 12h
-- Llamado tanto por apps/web (cliente cancela su propia reservacion) como
-- por apps/admin (staff cancela cualquier reservacion de su negocio). Por
-- eso el chequeo de autorizacion tiene dos caminos: dueno de la fila
-- (customer_id = auth.uid()) O staff/admin del mismo tenant. La version
-- previa de esta funcion (dentro de este mismo archivo, nunca aplicada a
-- produccion) no verificaba ninguno de los dos, permitiendo a cualquier
-- usuario autenticado cancelar la reservacion de otro cliente.
create or replace function public.cancel_booking(p_booking_id uuid)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_actor_role public.user_role;
  v_booking public.bookings;
  v_class public.studio_classes;
  v_cutoff timestamptz;
  v_refund boolean;
begin
  v_actor_role := public.current_user_role();

  select * into v_booking from public.bookings where id = p_booking_id for update;
  if not found then
    raise exception 'Reservacion no encontrada';
  end if;

  if v_booking.customer_id is distinct from auth.uid()
     and (v_actor_role is null
          or v_actor_role not in ('STAFF', 'BUSINESS_ADMIN', 'SUPER_ADMIN')) then
    raise exception 'No autorizado';
  end if;

  if v_booking.customer_id is distinct from auth.uid()
     and v_actor_role is distinct from 'SUPER_ADMIN'
     and v_booking.business_id is distinct from public.current_user_business_id() then
    raise exception 'No autorizado';
  end if;

  if v_booking.status = 'CANCELLED' then
    raise exception 'La reservacion ya estaba cancelada';
  end if;

  select * into v_class from public.studio_classes where id = v_booking.class_id for share;
  if not found then
    raise exception 'Clase no encontrada';
  end if;

  v_cutoff := v_class.starts_at - interval '12 hours';
  v_refund := (now() < v_cutoff);

  update public.bookings
  set status = 'CANCELLED',
      cancelled_at = now(),
      refunded = v_refund,
      updated_at = now()
  where id = p_booking_id;

  if v_refund then
    insert into public.customer_credits_ledger (business_id, customer_id, delta, reason, granted_by)
    values (v_booking.business_id, v_booking.customer_id, 1, 'BOOKING_REFUNDED', auth.uid());
  else
    insert into public.customer_credits_ledger (business_id, customer_id, delta, reason, granted_by)
    values (v_booking.business_id, v_booking.customer_id, 0, 'BOOKING_CANCELLED_LATE', auth.uid());
  end if;
end;
$$;

grant execute on function public.cancel_booking(uuid) to authenticated;
revoke execute on function public.cancel_booking(uuid) from public, anon;

-- 2. reset_monthly_credits (para pg_cron dia 1 de cada mes)
create or replace function public.reset_monthly_credits()
returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_customer record;
  v_balance integer;
begin
  for v_customer in
    select customer_id, business_id, coalesce(sum(delta), 0) as balance
    from public.customer_credits_ledger
    group by customer_id, business_id
    having coalesce(sum(delta), 0) > 0
  loop
    insert into public.customer_credits_ledger (business_id, customer_id, delta, reason, granted_by)
    values (v_customer.business_id, v_customer.customer_id, -v_customer.balance, 'MONTHLY_EXPIRATION', null);
  end loop;
end;
$$;

-- Sin este revoke, cualquier usuario autenticado (o anonimo, ya que Postgres
-- otorga EXECUTE a PUBLIC por defecto al crear una funcion y Supabase ademas
-- otorga a anon/authenticated via ALTER DEFAULT PRIVILEGES) podria invocar
-- reset_monthly_credits() por su cuenta y poner en 0 el balance de creditos
-- de todos los clientes del negocio -- mismo patron de riesgo ya documentado
-- en 011_bookings.sql. No se otorga a ningun rol de cliente: solo se invoca
-- via pg_cron (que corre como el rol que agenda el cron job, tipicamente
-- postgres, el cual no depende de estos grants).
revoke execute on function public.reset_monthly_credits() from public, anon, authenticated;

-- Nota: programar via pg_cron:
-- select cron.schedule('monthly-credit-reset', '0 0 1 * *', 'select public.reset_monthly_credits();');

-- 3. book_class (ya existe, no cambios en 016) - ver 017_fix_book_class_
--    customer_self_service.sql para el fix de auto-reserva de clientes.
-- 4. promote_from_waitlist: NO se elimina todavia. apps/admin sigue
--    llamando a esta RPC (features/bookings/services/bookingsService.ts,
--    boton "Promover" en la UI de waitlist). La UI de "solo recordatorio"
--    (insertar en waitlist_notifications + boton "Enviar recordatorio")
--    todavia no esta construida -- ver docs/roadmap.md. Eliminar esta
--    funcion antes de ese swap de frontend rompe el boton "Promover" en
--    produccion con un error "function does not exist".

-- 5. grant_credits (ya existe, no cambios)
-- 6. waitlist: insert/delete directo (ya funciona con RLS own_manage)