-- supabase/migrations/024_admin_invites_rpc.sql
-- admin_allowed_emails (009_admin_allowed_emails.sql) no tiene policies a
-- proposito -- nadie via anon/authenticated puede leer/escribir la tabla
-- directamente. Estas RPC SECURITY DEFINER son la unica via de acceso
-- desde el panel, y verifican SUPER_ADMIN ellas mismas (no confian en nada
-- que venga del cliente). Sirven a la pestana "Admins" en apps/admin.

create or replace function public.list_admin_invites()
returns table (
  email text,
  role public.user_role,
  created_at timestamptz,
  registered boolean
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.current_user_role() is distinct from 'SUPER_ADMIN' then
    raise exception 'No autorizado';
  end if;

  return query
    select
      a.email,
      a.role,
      a.created_at,
      exists (select 1 from auth.users u where u.email = a.email) as registered
    from public.admin_allowed_emails a
    order by a.created_at desc;
end;
$$;

create or replace function public.add_admin_invite(p_email text, p_role public.user_role)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.current_user_role() is distinct from 'SUPER_ADMIN' then
    raise exception 'No autorizado';
  end if;

  if p_role not in ('STAFF', 'BUSINESS_ADMIN', 'SUPER_ADMIN') then
    raise exception 'Rol invalido para invitacion: %', p_role;
  end if;

  insert into public.admin_allowed_emails (email, role)
  values (lower(trim(p_email)), p_role)
  on conflict (email) do update set role = excluded.role;
end;
$$;

create or replace function public.remove_admin_invite(p_email text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.current_user_role() is distinct from 'SUPER_ADMIN' then
    raise exception 'No autorizado';
  end if;

  delete from public.admin_allowed_emails where email = lower(trim(p_email));
end;
$$;

grant execute on function public.list_admin_invites() to authenticated;
grant execute on function public.add_admin_invite(text, public.user_role) to authenticated;
grant execute on function public.remove_admin_invite(text) to authenticated;
revoke execute on function public.list_admin_invites() from public, anon;
revoke execute on function public.add_admin_invite(text, public.user_role) from public, anon;
revoke execute on function public.remove_admin_invite(text) from public, anon;
