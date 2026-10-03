-- supabase/migrations/033_class_booking_counts.sql
-- Cupo real en el calendario de apps/web. Un cliente solo puede leer SUS
-- reservas (RLS "bookings_own_select", migracion 015), asi que la web
-- contaba solo las propias y una clase llena seguia ofreciendo "Reservar"
-- (book_class la rechazaba despues). Esta funcion devuelve solo cuantas
-- reservas CONFIRMED tiene cada clase: sin ids de cliente ni ningun otro
-- dato, igual de publico que studio_classes (lectura publica, 004).
--
-- security definer porque necesita contar filas que RLS le oculta al
-- usuario; es de solo lectura y no recibe nada que permita escribir, por
-- eso no lleva chequeo de rol (ver docs/security.md, checklist de RPCs).

create or replace function public.class_booking_counts(class_ids uuid[])
returns table (class_id uuid, booked_count integer)
language sql
security definer
stable
set search_path = public
as $$
  select b.class_id, count(*)::integer
  from public.bookings b
  where b.class_id = any(class_ids)
    and b.status = 'CONFIRMED'
  group by b.class_id;
$$;

revoke execute on function public.class_booking_counts(uuid[]) from public;
-- anon incluido a proposito: el calendario se ve sin iniciar sesion.
grant execute on function public.class_booking_counts(uuid[]) to anon, authenticated;
