-- supabase/migrations/036_guest_bookings_and_4h_cancel_window.sql
-- 1. Ventana de cancelacion con reembolso: de 8 a 4 horas (decision de la
--    duena, 2026-10-08). Reemplaza cancel_booking() de 029.
-- 2. Reservas "No registrado": el staff puede reservar (o poner en lista de
--    espera) a una persona escribiendo solo su nombre, sin cuenta ni perfil.
--    Ocupa lugar en el cupo igual que cualquier reservacion, pero nunca
--    toca creditos (no cobra al reservar, no reembolsa al cancelar) ni
--    genera avisos (no hay a quien avisar). bookings/waitlist ganan
--    guest_name y customer_id pasa a ser opcional: exactamente uno de los
--    dos esta presente. Solo staff crea estas filas: book_guest() para
--    reservar (rpc) y la policy existente waitlist_manage_staff para la
--    lista de espera.

-- Esquema --------------------------------------------------------------

alter table public.bookings alter column customer_id drop not null;
alter table public.bookings add column if not exists guest_name text;
alter table public.bookings add constraint bookings_customer_or_guest
  check ((customer_id is null) <> (guest_name is null)
         and (guest_name is null or length(btrim(guest_name)) between 1 and 120));

alter table public.waitlist alter column customer_id drop not null;
alter table public.waitlist add column if not exists guest_name text;
alter table public.waitlist add constraint waitlist_customer_or_guest
  check ((customer_id is null) <> (guest_name is null)
         and (guest_name is null or length(btrim(guest_name)) between 1 and 120));

-- Reservar a un "No registrado" -----------------------------------------

create or replace function public.book_guest(p_class_id uuid, p_guest_name text)
returns public.bookings
language plpgsql security definer set search_path = public
as $$
declare
  v_actor_role public.user_role;
  v_business_id uuid;
  v_max_capacity integer;
  v_current_count integer;
  v_name text := btrim(coalesce(p_guest_name, ''));
  v_booking public.bookings;
begin
  v_actor_role := public.current_user_role();
  if v_actor_role is null
     or v_actor_role not in ('STAFF', 'BUSINESS_ADMIN', 'SUPER_ADMIN') then
    raise exception 'No autorizado';
  end if;

  if length(v_name) = 0 or length(v_name) > 120 then
    raise exception 'Escribe el nombre de la persona (maximo 120 caracteres)';
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

  select count(*) into v_current_count
  from public.bookings
  where class_id = p_class_id and status = 'CONFIRMED';

  if v_current_count >= v_max_capacity then
    raise exception 'La clase ya no tiene cupo disponible';
  end if;

  insert into public.bookings (business_id, class_id, guest_name, status)
  values (v_business_id, p_class_id, v_name, 'CONFIRMED')
  returning * into v_booking;

  return v_booking;
end;
$$;

grant execute on function public.book_guest(uuid, text) to authenticated;
revoke execute on function public.book_guest(uuid, text) from public, anon;

-- Promover de lista de espera: el "No registrado" pasa por book_guest
-- (sin credito); el cliente registrado sigue por book_class (cobra 1).

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

  if v_entry.customer_id is null then
    v_booking := public.book_guest(v_entry.class_id, v_entry.guest_name);
  else
    v_booking := public.book_class(v_entry.customer_id, v_entry.class_id);
  end if;

  delete from public.waitlist where id = p_waitlist_id;

  return v_booking;
end;
$$;

-- Cancelar reservacion: 4 horas, y sin creditos para "No registrado" ------

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

  -- Un "No registrado" (customer_id null) nunca coincide con auth.uid():
  -- solo staff puede cancelarlo.
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

  if v_booking.customer_id is null then
    update public.bookings
    set status = 'CANCELLED', cancelled_at = now(), refunded = false, updated_at = now()
    where id = p_booking_id;
    return;
  end if;

  v_cutoff := v_class.starts_at - interval '4 hours';
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

-- Clase cancelada (035): "No registrado" sin reembolso ni aviso -----------

create or replace function public.handle_studio_class_cancelled()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  v_booking public.bookings;
begin
  for v_booking in
    update public.bookings
    set status = 'CANCELLED',
        cancelled_at = now(),
        refunded = (customer_id is not null),
        cancelled_by_business = true,
        updated_at = now()
    where class_id = new.id and status = 'CONFIRMED'
    returning *
  loop
    continue when v_booking.customer_id is null;

    insert into public.customer_credits_ledger (business_id, customer_id, delta, reason, granted_by, notes)
    values (v_booking.business_id, v_booking.customer_id, 1, 'BOOKING_REFUNDED', auth.uid(),
            'Clase cancelada por la academia');

    insert into public.notification_outbox (business_id, customer_id, type, payload)
    values (v_booking.business_id, v_booking.customer_id, 'CLASS_CANCELLED',
            jsonb_build_object('class_id', new.id, 'class_title', new.title, 'starts_at', new.starts_at,
                               'booking_id', v_booking.id));
  end loop;

  insert into public.notification_outbox (business_id, customer_id, type, payload)
  select w.business_id, w.customer_id, 'CLASS_CANCELLED',
         jsonb_build_object('class_id', new.id, 'class_title', new.title, 'starts_at', new.starts_at,
                            'waitlist', true)
  from public.waitlist w
  where w.class_id = new.id and w.customer_id is not null;

  delete from public.waitlist where class_id = new.id;

  return new;
end;
$$;

revoke execute on function public.handle_studio_class_cancelled() from public, anon, authenticated;
