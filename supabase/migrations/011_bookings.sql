-- supabase/migrations/011_bookings.sql
-- Reservaciones, lista de espera y ledger de creditos. Toda escritura de
-- bookings/ledger pasa por las funciones RPC de abajo (RLS solo permite
-- select en esas dos tablas) para garantizar la verificacion atomica de
-- cupo y credito -- ver docs/superpowers/specs/2026-08-30-admin-bookings-design.md.

create table public.customer_credits_ledger (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.business (id),
  customer_id uuid not null references public.profiles (id),
  delta integer not null,
  reason text not null check (reason in (
    'MANUAL_GRANT', 'PACKAGE_GRANT', 'BOOKING_CONSUMED', 'BOOKING_REFUNDED'
  )),
  granted_by uuid references public.profiles (id),
  notes text,
  created_at timestamptz not null default now()
);

create table public.bookings (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.business (id),
  class_id uuid not null references public.studio_classes (id),
  customer_id uuid not null references public.profiles (id),
  status text not null default 'CONFIRMED' check (status in ('CONFIRMED', 'CANCELLED')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index bookings_active_unique
  on public.bookings (class_id, customer_id)
  where status = 'CONFIRMED';

create table public.waitlist (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.business (id),
  class_id uuid not null references public.studio_classes (id),
  customer_id uuid not null references public.profiles (id),
  created_at timestamptz not null default now()
);
create unique index waitlist_unique on public.waitlist (class_id, customer_id);

-- customer_id no es unique (un cliente puede tener muchas filas de ledger),
-- pero getCreditBalance() y el chequeo de credito en book_class() filtran
-- por customer_id en cada carga de pagina / cada reservacion -- la tabla es
-- append-only y solo crece.
create index customer_credits_ledger_customer_id_idx
  on public.customer_credits_ledger (customer_id);

alter table public.customer_credits_ledger enable row level security;
create policy "credits_ledger_select_staff"
  on public.customer_credits_ledger for select
  using (
    public.current_user_role() = 'SUPER_ADMIN'
    or (business_id = public.current_user_business_id()
        and public.current_user_role() in ('STAFF', 'BUSINESS_ADMIN'))
  );

alter table public.bookings enable row level security;
create policy "bookings_select_staff"
  on public.bookings for select
  using (
    public.current_user_role() = 'SUPER_ADMIN'
    or (business_id = public.current_user_business_id()
        and public.current_user_role() in ('STAFF', 'BUSINESS_ADMIN'))
  );

alter table public.waitlist enable row level security;
create policy "waitlist_manage_staff"
  on public.waitlist for all
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

create or replace function public.book_class(p_customer_id uuid, p_class_id uuid)
returns public.bookings
language plpgsql security definer set search_path = public
as $$
declare
  v_actor_role public.user_role;
  v_business_id uuid;
  v_customer_business_id uuid;
  v_max_capacity integer;
  v_current_count integer;
  v_balance integer;
  v_booking public.bookings;
begin
  -- v_actor_role puede ser NULL si el actor no tiene fila propia en
  -- profiles; `NULL not in (...)` tambien es NULL, y un IF de plpgsql
  -- trata NULL como FALSE (fail-open) -- ver 008_fix_null_actor_role_
  -- fail_open.sql, mismo patron. El chequeo explicito `is null` fuerza
  -- el default a "bloquear". Va antes de cualquier lock/lookup de fila:
  -- un actor no autorizado nunca debe llegar al FOR UPDATE de abajo.
  v_actor_role := public.current_user_role();
  if v_actor_role is null
     or v_actor_role not in ('STAFF', 'BUSINESS_ADMIN', 'SUPER_ADMIN') then
    raise exception 'No autorizado';
  end if;

  select business_id, max_capacity into v_business_id, v_max_capacity
  from public.studio_classes
  where id = p_class_id and status = 'SCHEDULED'
  for update;

  if not found then
    raise exception 'Clase no encontrada o no esta programada';
  end if;

  if v_actor_role is distinct from 'SUPER_ADMIN'
     and v_business_id is distinct from public.current_user_business_id() then
    raise exception 'No autorizado';
  end if;

  select business_id into v_customer_business_id from public.profiles where id = p_customer_id;
  if not found then
    raise exception 'Cliente no encontrado';
  end if;
  if v_customer_business_id is distinct from v_business_id then
    raise exception 'No autorizado';
  end if;

  if exists (
    select 1 from public.bookings
    where class_id = p_class_id and customer_id = p_customer_id and status = 'CONFIRMED'
  ) then
    raise exception 'El cliente ya tiene una reservacion activa para esta clase';
  end if;

  select count(*) into v_current_count
  from public.bookings
  where class_id = p_class_id and status = 'CONFIRMED';

  if v_current_count >= v_max_capacity then
    raise exception 'La clase ya no tiene cupo disponible';
  end if;

  select coalesce(sum(delta), 0) into v_balance
  from public.customer_credits_ledger
  where customer_id = p_customer_id and business_id = v_business_id;

  if v_balance < 1 then
    raise exception 'El cliente no tiene creditos disponibles';
  end if;

  insert into public.bookings (business_id, class_id, customer_id, status)
  values (v_business_id, p_class_id, p_customer_id, 'CONFIRMED')
  returning * into v_booking;

  insert into public.customer_credits_ledger (business_id, customer_id, delta, reason, granted_by)
  values (v_business_id, p_customer_id, -1, 'BOOKING_CONSUMED', auth.uid());

  return v_booking;
end;
$$;

create or replace function public.cancel_booking(p_booking_id uuid)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_actor_role public.user_role;
  v_booking public.bookings;
begin
  v_actor_role := public.current_user_role();
  if v_actor_role is null
     or v_actor_role not in ('STAFF', 'BUSINESS_ADMIN', 'SUPER_ADMIN') then
    raise exception 'No autorizado';
  end if;

  select * into v_booking from public.bookings where id = p_booking_id for update;

  if not found then
    raise exception 'Reservacion no encontrada';
  end if;

  if v_actor_role is distinct from 'SUPER_ADMIN'
     and v_booking.business_id is distinct from public.current_user_business_id() then
    raise exception 'No autorizado';
  end if;

  if v_booking.status = 'CANCELLED' then
    raise exception 'La reservacion ya estaba cancelada';
  end if;

  update public.bookings set status = 'CANCELLED', updated_at = now() where id = p_booking_id;

  insert into public.customer_credits_ledger (business_id, customer_id, delta, reason, granted_by)
  values (v_booking.business_id, v_booking.customer_id, 1, 'BOOKING_REFUNDED', auth.uid());
end;
$$;

create or replace function public.promote_from_waitlist(p_waitlist_id uuid)
returns public.bookings
language plpgsql security definer set search_path = public
as $$
declare
  v_actor_role public.user_role;
  v_entry public.waitlist;
  v_booking public.bookings;
begin
  v_actor_role := public.current_user_role();
  if v_actor_role is null
     or v_actor_role not in ('STAFF', 'BUSINESS_ADMIN', 'SUPER_ADMIN') then
    raise exception 'No autorizado';
  end if;

  select * into v_entry from public.waitlist where id = p_waitlist_id for update;

  if not found then
    raise exception 'Entrada de lista de espera no encontrada';
  end if;

  if v_actor_role is distinct from 'SUPER_ADMIN'
     and v_entry.business_id is distinct from public.current_user_business_id() then
    raise exception 'No autorizado';
  end if;

  v_booking := public.book_class(v_entry.customer_id, v_entry.class_id);

  delete from public.waitlist where id = p_waitlist_id;

  return v_booking;
end;
$$;

create or replace function public.grant_credits(p_customer_id uuid, p_amount integer, p_notes text default null)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_actor_role public.user_role;
  v_business_id uuid;
begin
  v_actor_role := public.current_user_role();
  if v_actor_role is null
     or v_actor_role not in ('STAFF', 'BUSINESS_ADMIN', 'SUPER_ADMIN') then
    raise exception 'No autorizado';
  end if;

  if p_amount <= 0 then
    raise exception 'La cantidad de creditos debe ser mayor a 0';
  end if;

  select business_id into v_business_id from public.profiles where id = p_customer_id;
  if not found then
    raise exception 'Cliente no encontrado';
  end if;

  if v_actor_role is distinct from 'SUPER_ADMIN'
     and v_business_id is distinct from public.current_user_business_id() then
    raise exception 'No autorizado';
  end if;

  insert into public.customer_credits_ledger (business_id, customer_id, delta, reason, granted_by, notes)
  values (v_business_id, p_customer_id, p_amount, 'MANUAL_GRANT', auth.uid(), p_notes);
end;
$$;

grant execute on function public.book_class(uuid, uuid) to authenticated;
grant execute on function public.cancel_booking(uuid) to authenticated;
grant execute on function public.promote_from_waitlist(uuid) to authenticated;
grant execute on function public.grant_credits(uuid, integer, text) to authenticated;

-- Las 4 funciones ya validan rol (STAFF/BUSINESS_ADMIN/SUPER_ADMIN) y tenant
-- (business_id = current_user_business_id() salvo SUPER_ADMIN) al inicio de
-- cada una -- ver los `raise exception 'No autorizado'` arriba. Los revokes
-- de abajo son una capa adicional: Postgres otorga EXECUTE a PUBLIC por
-- defecto al crear una funcion, y el setup por defecto de Supabase ademas
-- otorga EXECUTE a anon/authenticated/service_role via ALTER DEFAULT
-- PRIVILEGES. Sin estos revokes, un usuario anonimo podria invocar las
-- funciones directamente via RPC sin sesion (aunque el chequeo de rol
-- interno igual las rechazaria por falta de current_user_role()).
revoke execute on function public.book_class(uuid, uuid) from public;
revoke execute on function public.cancel_booking(uuid) from public;
revoke execute on function public.promote_from_waitlist(uuid) from public;
revoke execute on function public.grant_credits(uuid, integer, text) from public;

revoke execute on function public.book_class(uuid, uuid) from anon;
revoke execute on function public.cancel_booking(uuid) from anon;
revoke execute on function public.promote_from_waitlist(uuid) from anon;
revoke execute on function public.grant_credits(uuid, integer, text) from anon;
