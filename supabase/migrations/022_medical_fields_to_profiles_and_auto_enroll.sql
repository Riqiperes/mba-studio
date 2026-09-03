-- supabase/migrations/022_medical_fields_to_profiles_and_auto_enroll.sql
-- 1. Mueve condiciones medicas/notas del alumno (dependents) al cliente
--    adulto (profiles) -- decision del usuario: tiene mas sentido para
--    Pilates (embarazo, hernia, lesiones) en el adulto que en el nino de
--    Academia. La edad de un alumno deja de guardarse como numero
--    (quedaba obsoleta apenas pasaba el cumpleanos): se sigue calculando
--    en el momento a partir de birth_date, que dependents ya tenia desde
--    010_dependents.sql.
-- 2. Auto-inscripcion por rango de edad: al crear/editar un grupo de
--    Academia con age_min/age_max, inscribe automaticamente a los
--    alumnos activos cuya edad (calculada de su birth_date) caiga en el
--    rango, hasta el cupo maximo del grupo.

alter table public.profiles
  add column if not exists medical_conditions text,
  add column if not exists notes text;

comment on column public.profiles.medical_conditions is
  'Condiciones medicas relevantes para la practica (embarazo, hernia, lesiones, etc.)';
comment on column public.profiles.notes is
  'Notas libres del staff sobre el cliente';

alter table public.dependents
  drop column if exists medical_conditions,
  drop column if exists notes,
  drop column if exists age;

create or replace function public.academy_groups_auto_enroll_by_age()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_current_count integer;
  v_remaining integer;
  v_candidate record;
begin
  if new.age_min is null and new.age_max is null then
    return new;
  end if;

  select count(*) into v_current_count
  from public.academy_enrollments
  where group_id = new.id and status = 'ACTIVA';

  v_remaining := new.max_capacity - v_current_count;
  if v_remaining <= 0 then
    return new;
  end if;

  for v_candidate in
    select d.id
    from public.dependents d
    where d.business_id = new.business_id
      and d.active
      and d.birth_date is not null
      and extract(year from age(current_date, d.birth_date)) >= coalesce(new.age_min, 0)
      and extract(year from age(current_date, d.birth_date)) <= coalesce(new.age_max, 200)
      and not exists (
        select 1 from public.academy_enrollments e
        where e.dependent_id = d.id and e.group_id = new.id and e.status = 'ACTIVA'
      )
    order by d.created_at asc
    limit v_remaining
  loop
    insert into public.academy_enrollments (business_id, dependent_id, group_id)
    values (new.business_id, v_candidate.id, new.id);
  end loop;

  return new;
end;
$$;

drop trigger if exists academy_groups_auto_enroll_by_age_trigger on public.academy_groups;
create trigger academy_groups_auto_enroll_by_age_trigger
  after insert or update of age_min, age_max, max_capacity, active on public.academy_groups
  for each row execute function public.academy_groups_auto_enroll_by_age();

revoke execute on function public.academy_groups_auto_enroll_by_age() from public, anon, authenticated;
