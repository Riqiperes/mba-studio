-- Tabla studio_classes: clases de Pilates (ver docs/database.md).

create type public.studio_class_status as enum ('SCHEDULED', 'CANCELLED', 'COMPLETED');

create table public.studio_classes (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.business (id),
  instructor_id uuid not null references public.instructors (id),
  title text not null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  max_capacity integer not null check (max_capacity > 0),
  status public.studio_class_status not null default 'SCHEDULED',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at > starts_at)
);

create index studio_classes_business_id_idx on public.studio_classes (business_id);
create index studio_classes_instructor_id_idx on public.studio_classes (instructor_id);
create index studio_classes_starts_at_idx on public.studio_classes (starts_at);

alter table public.studio_classes enable row level security;

-- Lectura publica: el calendario de clases es parte del catalogo/marketing.
create policy "studio_classes_select_public"
  on public.studio_classes
  for select
  using (true);

create policy "studio_classes_manage_staff"
  on public.studio_classes
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
