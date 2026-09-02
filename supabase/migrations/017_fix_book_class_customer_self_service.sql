-- supabase/migrations/017_fix_book_class_customer_self_service.sql
-- book_class (011_bookings.sql) valida current_user_role() in ('STAFF',
-- 'BUSINESS_ADMIN', 'SUPER_ADMIN') -- fix intencional de un IDOR anterior,
-- ver "Known Issues" en docs/CURRENT_STATE.md. Ese chequeo bloquea a
-- cualquier cliente con rol CUSTOMER, incluido el flujo de reservacion
-- propia desde apps/web (commit "feat(web): client-side bookings, waitlist
-- & credits"), que llama a esta misma RPC pasando el propio auth.uid()
-- como p_customer_id. Sin este fix, ningun cliente real puede reservar una
-- clase desde apps/web. No se edita 011_bookings.sql: ya esta aplicada a
-- Supabase (ver CLAUDE.md, "nunca se edita una migracion ya aplicada").

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
  v_actor_role := public.current_user_role();
  if v_actor_role is null then
    raise exception 'No autorizado';
  end if;

  -- Permitido: el cliente reserva para si mismo (p_customer_id = su propio
  -- auth.uid(), sin importar su rol) O un actor STAFF/BUSINESS_ADMIN/
  -- SUPER_ADMIN reserva a nombre de cualquier cliente (flujo de apps/admin).
  if p_customer_id is distinct from auth.uid()
     and v_actor_role not in ('STAFF', 'BUSINESS_ADMIN', 'SUPER_ADMIN') then
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

-- create or replace conserva los grants/revokes ya aplicados sobre esta
-- funcion en 011 (grant a authenticated, revoke de public/anon); no hace
-- falta repetirlos.
