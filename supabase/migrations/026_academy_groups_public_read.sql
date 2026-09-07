-- supabase/migrations/026_academy_groups_public_read.sql
-- academy_groups y academy_group_schedules eran 100% staff-scoped (012):
-- ningun cliente podia ver el catalogo de Academia en apps/web. Agrega
-- lectura publica de grupos activos y sus horarios, mismo patron que
-- packages (005) y studio_classes (004). No se toca academy_enrollments
-- ni dependents: inscribir sigue siendo por WhatsApp, sin self-service
-- todavia (ver docs/superpowers/specs/2026-09-07-academy-web-self-enrollment-design.md).

create policy "academy_groups_select_active_public"
  on public.academy_groups
  for select
  using (active);

create policy "academy_group_schedules_select_public"
  on public.academy_group_schedules
  for select
  using (
    exists (
      select 1 from public.academy_groups g
      where g.id = academy_group_schedules.group_id and g.active
    )
  );
