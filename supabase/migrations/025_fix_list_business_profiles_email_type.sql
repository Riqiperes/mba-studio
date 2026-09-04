-- supabase/migrations/025_fix_list_business_profiles_email_type.sql
-- list_business_profiles() (021_users_admin_and_instructor_rls.sql)
-- declaraba la columna de salida `email text`, pero auth.users.email es
-- `character varying(255)` -- Postgres 17 rechaza ese mismatch en
-- RETURN QUERY ("structure of query does not match function result
-- type"), asi que la RPC siempre fallaba con 400 y /users en el panel
-- nunca cargaba la lista de usuarios. Fix: castear a text explicitamente.

create or replace function public.list_business_profiles()
returns table (
  id uuid,
  email text,
  full_name text,
  phone text,
  role public.user_role,
  instructor_id uuid,
  discount_percent integer,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor_role public.user_role;
  v_business_id uuid;
begin
  v_actor_role := public.current_user_role();
  if v_actor_role is null or v_actor_role not in ('BUSINESS_ADMIN', 'SUPER_ADMIN') then
    raise exception 'No autorizado';
  end if;

  v_business_id := public.current_user_business_id();

  return query
    select p.id, u.email::text, p.full_name, p.phone, p.role, p.instructor_id, p.discount_percent, p.created_at
    from public.profiles p
    join auth.users u on u.id = p.id
    where v_actor_role = 'SUPER_ADMIN' or p.business_id = v_business_id
    order by p.created_at desc;
end;
$$;
