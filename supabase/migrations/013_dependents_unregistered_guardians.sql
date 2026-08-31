-- supabase/migrations/013_dependents_unregistered_guardians.sql
-- Permite registrar alumnos (dependents) cuyos tutores pagan en mostrador
-- y no tienen cuenta de usuario en Supabase Auth.

alter table public.dependents
  alter column guardian_id drop not null;

alter table public.dependents
  add column guardian_name text,
  add column guardian_phone text;

alter table public.dependents
  add constraint dependents_guardian_check
  check (
    (guardian_id is not null)
    or (guardian_name is not null and trim(guardian_name) <> '')
  );
