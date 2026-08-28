-- Endurece permisos: handle_new_user() y prevent_profile_privilege_escalation()
-- (definidas en 002_profiles.sql) son funciones de trigger, nunca deben
-- invocarse directo via RPC. Postgres las expone por defecto via PostgREST
-- a anon/authenticated porque son SECURITY DEFINER en el schema public
-- (ver advisor de seguridad). Postgres sigue pudiendo llamarlas como
-- triggers sin este privilegio, asi que revocarlo no rompe nada.

revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.prevent_profile_privilege_escalation() from public, anon, authenticated;
