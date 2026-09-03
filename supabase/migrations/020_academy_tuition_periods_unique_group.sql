-- supabase/migrations/020_academy_tuition_periods_unique_group.sql
-- academyTuitionService.upsertTuitionPeriod() usa
-- `.upsert(payload, { onConflict: 'group_id' })`, pero
-- academy_tuition_periods (014_academy_tuition.sql) nunca tuvo una
-- constraint unique/exclusion sobre group_id -- solo un indice normal
-- (academy_tuition_periods_group_id_idx). Sin la constraint, Postgres
-- rechaza el upsert con "there is no unique or exclusion constraint
-- matching the ON CONFLICT specification". Nada llamaba a esta funcion
-- todavia (no habia UI para configurar colegiatura por grupo), por eso
-- el bug no se habia manifestado. Un grupo tiene como maximo un periodo
-- de colegiatura activo, asi que la unicidad por group_id es correcta.

alter table public.academy_tuition_periods
  add constraint academy_tuition_periods_group_id_unique unique (group_id);
