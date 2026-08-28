-- Corrige un fallo fail-open en prevent_profile_privilege_escalation()
-- (introducida en 007): usaba `<>` y `NOT IN` contra v_actor_role. Si
-- current_user_role() devuelve NULL (el actor no tiene fila propia en
-- profiles), esas comparaciones tambien devuelven NULL, y un IF de
-- plpgsql trata NULL como FALSE: la rama que revierte role/business_id
-- NO se ejecuta, dejando pasar el cambio.
--
-- Con el RLS actual no hay una via de explotacion en vivo (las policies
-- de profiles exigen que el actor ya tenga su propia fila para que la
-- comparacion `id = auth.uid()` u otras ramas dejen pasar el UPDATE, lo
-- que garantiza current_user_role() no-nulo), pero el trigger no debe
-- depender de eso: es defensa en profundidad, y una NULL debe bloquear,
-- no permitir. IS DISTINCT FROM nunca devuelve NULL (siempre TRUE/FALSE),
-- asi que el default pasa a ser "bloquear".

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
  if new.role = 'SUPER_ADMIN' and v_actor_role IS DISTINCT FROM 'SUPER_ADMIN' then
    new.role := old.role;
  end if;

  -- Nadie por debajo de SUPER_ADMIN puede mover un profile a otro negocio.
  if new.business_id IS DISTINCT FROM old.business_id
     and v_actor_role IS DISTINCT FROM 'SUPER_ADMIN' then
    new.business_id := old.business_id;
  end if;

  -- Un actor sin profile propio o sin privilegios de gestion de roles
  -- (ni STAFF, ni admin) nunca puede cambiar role.
  if v_actor_role IS DISTINCT FROM 'BUSINESS_ADMIN'
     and v_actor_role IS DISTINCT FROM 'SUPER_ADMIN' then
    new.role := old.role;
  end if;

  return new;
end;
$$;
