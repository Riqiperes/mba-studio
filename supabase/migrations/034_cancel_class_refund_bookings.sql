-- supabase/migrations/034_cancel_class_refund_bookings.sql
-- Antes, cancelar una clase desde admin solo ponia studio_classes.status =
-- 'CANCELLED': las reservaciones seguian CONFIRMED, el credito no regresaba
-- y el cliente no se enteraba (la clase seguia en "Mi horario"; si la
-- cancelaba el mismo con menos de 8 horas perdia el credito).
--
-- Ahora un trigger sobre studio_classes hace, en la misma transaccion del
-- cambio de status (venga de donde venga):
--   1. cancela las reservaciones CONFIRMED de la clase, marcadas como
--      cancelled_by_business, y devuelve 1 credito por cada una (sin
--      importar la ventana de 8 horas: la culpa no es del cliente);
--   2. borra la lista de espera de la clase;
--   3. deja un aviso PENDING en notification_outbox por cliente afectado,
--      para que el envio por WhatsApp lo tome cuando exista el proveedor
--      real (docs/whatsapp.md). Hoy nadie lo consume: el aviso visible es
--      el de "Mi horario" en web, que lee cancelled_by_business.

alter table public.bookings
  add column if not exists cancelled_by_business boolean not null default false;

create table if not exists public.notification_outbox (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.business (id),
  customer_id uuid not null references public.profiles (id),
  -- Mismo nombre que NotificationType en supabase/functions/notifications/templates.ts
  type text not null check (type in ('CLASS_CANCELLED')),
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'PENDING' check (status in ('PENDING', 'SENT', 'FAILED')),
  error_message text,
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists notification_outbox_pending_idx
  on public.notification_outbox (created_at)
  where status = 'PENDING';
create index if not exists notification_outbox_customer_idx
  on public.notification_outbox (customer_id);

-- Solo lectura para staff del negocio. Las filas las escribe el trigger
-- (security definer) y, en el futuro, la Edge Function con service role;
-- ningun cliente ni staff inserta/edita directo.
alter table public.notification_outbox enable row level security;

drop policy if exists "notification_outbox_select_staff" on public.notification_outbox;
create policy "notification_outbox_select_staff"
  on public.notification_outbox for select
  using (
    public.current_user_role() = 'SUPER_ADMIN'
    or (business_id = public.current_user_business_id()
        and public.current_user_role() in ('STAFF', 'BUSINESS_ADMIN'))
  );

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

  delete from public.waitlist where class_id = new.id;

  return new;
end;
$$;

-- Solo la usa el trigger; nadie la llama por RPC.
revoke execute on function public.handle_studio_class_cancelled() from public, anon, authenticated;

drop trigger if exists studio_classes_cancelled on public.studio_classes;
create trigger studio_classes_cancelled
  after update of status on public.studio_classes
  for each row
  when (new.status = 'CANCELLED' and old.status is distinct from 'CANCELLED')
  execute function public.handle_studio_class_cancelled();
