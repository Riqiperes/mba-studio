-- Tabla instructors: instructores de Studio/Academia (ver docs/database.md).

create table public.instructors (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.business (id),
  full_name text not null,
  bio text,
  photo_url text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index instructors_business_id_idx on public.instructors (business_id);

alter table public.instructors enable row level security;

-- Lectura publica: forman parte del catalogo visible antes de login.
create policy "instructors_select_public"
  on public.instructors
  for select
  using (true);

create policy "instructors_manage_staff"
  on public.instructors
  for all
  using (
    public.current_user_role() = 'SUPER_ADMIN'
    or (
      business_id = public.current_user_business_id()
      and public.current_user_role() in ('STAFF', 'BUSINESS_ADMIN')
    )
  )
  with check (
    public.current_user_role() = 'SUPER_ADMIN'
    or (
      business_id = public.current_user_business_id()
      and public.current_user_role() in ('STAFF', 'BUSINESS_ADMIN')
    )
  );
