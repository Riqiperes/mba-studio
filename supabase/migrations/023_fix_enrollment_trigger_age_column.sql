-- supabase/migrations/023_fix_enrollment_trigger_age_column.sql
-- 022_medical_fields_to_profiles_and_auto_enroll.sql elimino
-- dependents.age (edad ahora se calcula de birth_date, no se guarda), pero
-- se me paso que enforce_academy_enrollment_capacity_and_age (016) todavia
-- hacia `select age into v_age from public.dependents ...` -- columna que
-- ya no existe, rompiendo toda inscripcion nueva ("column age does not
-- exist"). Corregido para calcular la edad de birth_date, igual que el
-- trigger de auto-inscripcion (022).

create or replace function public.enforce_academy_enrollment_capacity_and_age()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_group public.academy_groups;
  v_active_count integer;
  v_age integer;
begin
  if new.status is distinct from 'ACTIVA' then
    return new;
  end if;

  select * into v_group from public.academy_groups where id = new.group_id;
  if not found then
    raise exception 'Grupo no encontrado';
  end if;

  select count(*) into v_active_count
  from public.academy_enrollments
  where group_id = new.group_id and status = 'ACTIVA' and id is distinct from new.id;

  if v_active_count >= v_group.max_capacity then
    raise exception 'El grupo ya alcanzo su cupo maximo (% alumnos)', v_group.max_capacity;
  end if;

  select extract(year from age(current_date, birth_date))::integer into v_age
  from public.dependents where id = new.dependent_id;

  if v_group.age_min is not null and v_age is not null and v_age < v_group.age_min then
    raise exception 'El alumno no cumple la edad minima del grupo (% anos)', v_group.age_min;
  end if;
  if v_group.age_max is not null and v_age is not null and v_age > v_group.age_max then
    raise exception 'El alumno supera la edad maxima del grupo (% anos)', v_group.age_max;
  end if;

  return new;
end;
$$;
