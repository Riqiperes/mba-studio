-- supabase/migrations/018_revoke_academy_enrollment_trigger_execute.sql
-- enforce_academy_enrollment_capacity_and_age (016_comprehensive_features.sql)
-- es una funcion de trigger, nunca deberia invocarse directamente via RPC.
-- Postgres igual la expone con EXECUTE a PUBLIC por defecto (como cualquier
-- funcion nueva) y Supabase la otorga a anon/authenticated -- el advisor de
-- seguridad de Supabase la marco como "Public Can Execute SECURITY DEFINER
-- Function" tras aplicar 016. En la practica Postgres rechaza invocar una
-- funcion de tipo trigger fuera de un trigger ("trigger functions can only
-- be called as triggers"), pero se revoca explicito para no dejar el
-- advisor en rojo y seguir el mismo patron que el resto de RPCs del
-- proyecto (ver checklist en docs/security.md).
revoke execute on function public.enforce_academy_enrollment_capacity_and_age()
  from public, anon, authenticated;
