-- Corrige prevent_profile_privilege_escalation() (definida en 002_profiles.sql):
-- la version original solo bloqueaba cambios de role/business_id cuando el
-- actor NO era BUSINESS_ADMIN/SUPER_ADMIN. Combinado con la rama
-- `id = auth.uid()` de las policies de profiles (que no restringe role ni
-- business_id), esto permitia que un BUSINESS_ADMIN:
--   1. Escalara su propio role a SUPER_ADMIN.
--   2. Escalara el role de cualquier otro profile de su negocio a SUPER_ADMIN.
--   3. Reasignara su propio business_id a otro negocio (fuga de tenant).
--
-- La regla correcta: solo un SUPER_ADMIN existente puede otorgar el role
-- SUPER_ADMIN o mover un profile entre negocios. Un BUSINESS_ADMIN sigue
-- pudiendo administrar roles (CUSTOMER/STAFF/BUSINESS_ADMIN) dentro de su
-- propio business_id, que es lo que RLS ya acota.

create or replace function public.prevent_profile_privilege_escalation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor_role public.user_role;
begin
  v_actor_role := public.current_user_role();

  -- Nadie por debajo de SUPER_ADMIN puede otorgar (ni conservar via este
  -- update) el role SUPER_ADMIN a nadie, ni siquiera a si mismo.
  if new.role = 'SUPER_ADMIN' and v_actor_role <> 'SUPER_ADMIN' then
    new.role := old.role;
  end if;

  -- Nadie por debajo de SUPER_ADMIN puede mover un profile a otro negocio.
  if new.business_id <> old.business_id and v_actor_role <> 'SUPER_ADMIN' then
    new.business_id := old.business_id;
  end if;

  -- Un actor sin privilegios (ni STAFF, ni admin) nunca puede cambiar role.
  if v_actor_role not in ('BUSINESS_ADMIN', 'SUPER_ADMIN') then
    new.role := old.role;
  end if;

  return new;
end;
$$;
