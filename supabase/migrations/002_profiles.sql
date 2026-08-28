-- Tabla profiles: datos de perfil + rol + business_id de cada usuario.
-- Supabase Auth (auth.users) solo maneja identidad; ver docs/authentication.md.

create type public.user_role as enum ('CUSTOMER', 'STAFF', 'BUSINESS_ADMIN', 'SUPER_ADMIN');

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  business_id uuid not null references public.business (id),
  role public.user_role not null default 'CUSTOMER',
  full_name text,
  phone text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index profiles_business_id_idx on public.profiles (business_id);

-- Funciones SECURITY DEFINER: leen el rol/business_id del usuario actual sin
-- pasar por RLS de profiles, para evitar recursion infinita en sus propias
-- policies (patron recomendado por Supabase para RLS basado en rol).
create or replace function public.current_user_role()
returns public.user_role
language sql
security definer
stable
set search_path = public
as $$
  select role from public.profiles where id = auth.uid();
$$;

create or replace function public.current_user_business_id()
returns uuid
language sql
security definer
stable
set search_path = public
as $$
  select business_id from public.profiles where id = auth.uid();
$$;

-- Crea el profile automaticamente cuando alguien se registra en auth.users.
-- MVP de un solo negocio: se asigna el business existente mas antiguo.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_business_id uuid;
begin
  select id into v_business_id from public.business order by created_at limit 1;

  insert into public.profiles (id, business_id, role, full_name)
  values (
    new.id,
    v_business_id,
    'CUSTOMER',
    new.raw_user_meta_data ->> 'full_name'
  );

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Impide que un usuario se autoasigne un rol o cambie de negocio via UPDATE:
-- si quien edita no es admin/staff, la fila conserva su role/business_id.
create or replace function public.prevent_profile_privilege_escalation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.current_user_role() not in ('BUSINESS_ADMIN', 'SUPER_ADMIN') then
    new.role := old.role;
    new.business_id := old.business_id;
  end if;
  return new;
end;
$$;

create trigger profiles_prevent_privilege_escalation
  before update on public.profiles
  for each row execute function public.prevent_profile_privilege_escalation();

alter table public.profiles enable row level security;

create policy "profiles_select_own_or_staff"
  on public.profiles
  for select
  using (
    id = auth.uid()
    or public.current_user_role() = 'SUPER_ADMIN'
    or (
      business_id = public.current_user_business_id()
      and public.current_user_role() in ('STAFF', 'BUSINESS_ADMIN')
    )
  );

create policy "profiles_update_own_or_staff"
  on public.profiles
  for update
  using (
    id = auth.uid()
    or public.current_user_role() = 'SUPER_ADMIN'
    or (
      business_id = public.current_user_business_id()
      and public.current_user_role() in ('STAFF', 'BUSINESS_ADMIN')
    )
  )
  with check (
    id = auth.uid()
    or public.current_user_role() = 'SUPER_ADMIN'
    or (
      business_id = public.current_user_business_id()
      and public.current_user_role() in ('STAFF', 'BUSINESS_ADMIN')
    )
  );

-- Policies de escritura de business, deferidas desde 001_business.sql porque
-- necesitan profiles para verificar el rol de quien escribe.
create policy "business_update_admin"
  on public.business
  for update
  using (
    public.current_user_role() = 'SUPER_ADMIN'
    or (
      id = public.current_user_business_id()
      and public.current_user_role() = 'BUSINESS_ADMIN'
    )
  )
  with check (
    public.current_user_role() = 'SUPER_ADMIN'
    or (
      id = public.current_user_business_id()
      and public.current_user_role() = 'BUSINESS_ADMIN'
    )
  );
