-- supabase/migrations/030_customers_without_account.sql
-- Permite que el staff registre clientes de Studio que no quieren usar el
-- software (pagan y reservan en mostrador). Un cliente asi es una fila de
-- `profiles` sin usuario en auth.users, igual que los tutores sin cuenta de
-- 013_dependents_unregistered_guardians.sql.
--
-- Consecuencias del cambio:
--  * profiles.id ya no referencia auth.users: se pierde el ON DELETE CASCADE
--    (borrar un usuario de Auth ya no borra su profile).
--  * Si esa persona se registra despues, obtiene un profile nuevo; no se
--    fusiona con el creado por el staff.
--
-- No hay policy de INSERT en profiles a proposito: la unica via es esta RPC,
-- que verifica el rol ella misma y fija role/business_id (no confia en el
-- cliente).

alter table public.profiles
  drop constraint profiles_id_fkey;

alter table public.profiles
  alter column id set default gen_random_uuid();

create or replace function public.create_customer_without_account(
  p_full_name text,
  p_phone text default null,
  p_medical_conditions text default null,
  p_notes text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  if public.current_user_role() not in ('STAFF', 'BUSINESS_ADMIN', 'SUPER_ADMIN') then
    raise exception 'No autorizado';
  end if;

  if p_full_name is null or trim(p_full_name) = '' then
    raise exception 'El nombre del cliente es obligatorio';
  end if;

  insert into public.profiles (business_id, role, full_name, phone, medical_conditions, notes)
  values (
    public.current_user_business_id(),
    'CUSTOMER',
    trim(p_full_name),
    nullif(trim(p_phone), ''),
    nullif(trim(p_medical_conditions), ''),
    nullif(trim(p_notes), '')
  )
  returning id into v_id;

  return v_id;
end;
$$;

revoke execute on function public.create_customer_without_account(text, text, text, text) from public, anon;
grant execute on function public.create_customer_without_account(text, text, text, text) to authenticated;
