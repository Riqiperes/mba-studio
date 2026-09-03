-- supabase/migrations/019_schedule_monthly_credit_reset.sql
-- reset_monthly_credits() (016_comprehensive_features.sql) existe y esta
-- correctamente asegurada (revoke de execute a public/anon/authenticated,
-- ver docs/security.md), pero nada la invocaba todavia -- business-rules.md
-- exige el reset automatico el dia 1 de cada mes. pg_cron corre los jobs
-- como el rol que los agenda (aqui, el owner de la migracion), que no
-- depende de los grants de EXECUTE revocados para clientes.

create extension if not exists pg_cron;

select cron.schedule(
  'monthly-credit-reset',
  '0 0 1 * *',
  $$select public.reset_monthly_credits();$$
);
