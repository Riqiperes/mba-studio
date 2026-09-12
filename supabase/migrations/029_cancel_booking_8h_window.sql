-- supabase/migrations/029_cancel_booking_8h_window.sql
-- La ventana de cancelacion sin penalizacion definida por el negocio es de
-- 8 horas antes de la clase, no 12 (confirmado por la duena del negocio,
-- ver legal/plan-de-accion-legal.md). `016_comprehensive_features.sql`
-- (ya aplicada a produccion, no se edita) implemento la funcion con
-- interval '12 hours'; esta migracion la reemplaza con el mismo nombre y
-- firma para corregir el valor. `create or replace function` conserva los
-- grants/revokes ya aplicados (ver docs/security.md), se repiten aqui de
-- todas formas por claridad.

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

  v_cutoff := v_class.starts_at - interval '8 hours';
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
