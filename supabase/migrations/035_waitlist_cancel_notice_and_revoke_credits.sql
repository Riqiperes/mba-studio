-- supabase/migrations/035_waitlist_cancel_notice_and_revoke_credits.sql
-- 1. Clase cancelada: ahora tambien se avisa a quien estaba en la lista de
--    espera (034 solo avisaba a quien tenia reservacion). Se deja un aviso
--    CLASS_CANCELLED en notification_outbox con payload.waitlist = true
--    antes de vaciar la lista. El cliente puede leer sus propios avisos
--    (nueva policy) para verlos en "Mi horario".
-- 2. Quitar creditos desde admin: nueva RPC revoke_credits, espejo de
--    grant_credits (011) con delta negativo y razon MANUAL_REVOKE. No deja
--    el saldo en negativo.

-- 1. Aviso a la lista de espera ------------------------------------------

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
        refunded = true,
        cancelled_by_business = true,
        updated_at = now()
    where class_id = new.id and status = 'CONFIRMED'
    returning *
  loop
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
  where w.class_id = new.id;

  delete from public.waitlist where class_id = new.id;

  return new;
end;
$$;

-- create or replace conserva el revoke de 034; se repite por claridad.
revoke execute on function public.handle_studio_class_cancelled() from public, anon, authenticated;

drop policy if exists "notification_outbox_select_own" on public.notification_outbox;
create policy "notification_outbox_select_own"
  on public.notification_outbox for select
  using (customer_id = auth.uid());

-- 2. Quitar creditos -------------------------------------------------------

alter table public.customer_credits_ledger
  drop constraint customer_credits_ledger_reason_check;
alter table public.customer_credits_ledger
  add constraint customer_credits_ledger_reason_check
  check (reason in (
    'MANUAL_GRANT', 'MANUAL_REVOKE', 'PACKAGE_GRANT', 'BOOKING_CONSUMED',
    'BOOKING_REFUNDED', 'BOOKING_CANCELLED_LATE', 'MONTHLY_EXPIRATION'
  ));

create or replace function public.revoke_credits(p_customer_id uuid, p_amount integer, p_notes text default null)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_actor_role public.user_role;
  v_business_id uuid;
  v_balance integer;
begin
  v_actor_role := public.current_user_role();
  if v_actor_role is null
     or v_actor_role not in ('STAFF', 'BUSINESS_ADMIN', 'SUPER_ADMIN') then
    raise exception 'No autorizado';
  end if;

  if p_amount is null or p_amount <= 0 then
    raise exception 'La cantidad de creditos debe ser mayor a 0';
  end if;

  -- for update: dos quitas simultaneas al mismo cliente no pueden dejarlo en negativo
  select business_id into v_business_id from public.profiles where id = p_customer_id for update;
  if not found then
    raise exception 'Cliente no encontrado';
  end if;

  if v_actor_role is distinct from 'SUPER_ADMIN'
     and v_business_id is distinct from public.current_user_business_id() then
    raise exception 'No autorizado';
  end if;

  select coalesce(sum(delta), 0) into v_balance
  from public.customer_credits_ledger
  where customer_id = p_customer_id and business_id = v_business_id;

  if p_amount > v_balance then
    raise exception 'El cliente solo tiene % creditos', v_balance;
  end if;

  insert into public.customer_credits_ledger (business_id, customer_id, delta, reason, granted_by, notes)
  values (v_business_id, p_customer_id, -p_amount, 'MANUAL_REVOKE', auth.uid(), p_notes);
end;
$$;

grant execute on function public.revoke_credits(uuid, integer, text) to authenticated;
revoke execute on function public.revoke_credits(uuid, integer, text) from public, anon;
