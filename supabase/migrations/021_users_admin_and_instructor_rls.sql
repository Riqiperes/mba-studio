-- supabase/migrations/021_users_admin_and_instructor_rls.sql
-- 1. RPC para que BUSINESS_ADMIN/SUPER_ADMIN vean todas las cuentas
--    registradas (con email, que vive en auth.users, no en profiles) y
--    puedan asignarles rol -- pagina /users en apps/admin.
-- 2. Falta una policy de lectura para INSTRUCTOR_ADMIN sobre
--    academy_groups: 016_comprehensive_features.sql agrego la policy para
--    academy_enrollments pero no para academy_groups, asi que un
--    instructor podia ver las inscripciones de su grupo pero no el grupo
--    en si (nombre, horario).

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
    select p.id, u.email, p.full_name, p.phone, p.role, p.instructor_id, p.discount_percent, p.created_at
    from public.profiles p
    join auth.users u on u.id = p.id
    where v_actor_role = 'SUPER_ADMIN' or p.business_id = v_business_id
    order by p.created_at desc;
end;
$$;

grant execute on function public.list_business_profiles() to authenticated;
revoke execute on function public.list_business_profiles() from public, anon;

drop policy if exists "academy_groups_instructor_own_select" on public.academy_groups;
create policy "academy_groups_instructor_own_select"
  on public.academy_groups for select
  using (
    public.current_user_role() = 'INSTRUCTOR_ADMIN'
    and instructor_id = (
      select instructor_id from public.profiles where id = auth.uid()
    )
  );
