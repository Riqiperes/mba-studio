-- supabase/migrations/010_dependents.sql
-- Tabla dependents: alumnos (ej. hijos) de un cliente (profiles), usados
-- para inscripciones de Academia. La UI siempre los llama "Alumno", nunca
-- "Dependiente" -- ver docs/superpowers/specs/2026-08-29-admin-customers-design.md.

create table public.dependents (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.business (id),
  guardian_id uuid not null references public.profiles (id),
  full_name text not null,
  birth_date date,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index dependents_business_id_idx on public.dependents (business_id);
create index dependents_guardian_id_idx on public.dependents (guardian_id);

alter table public.dependents enable row level security;

-- Solo staff/admin del negocio pueden leer o escribir alumnos. Sin policy
-- de autoservicio del cliente todavia -- se agrega cuando exista una
-- pantalla real en apps/web que la use (ver Global Constraints del plan).
create policy "dependents_manage_staff"
  on public.dependents
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
