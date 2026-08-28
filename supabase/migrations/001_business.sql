-- Tabla business: configuracion white-label del negocio (ver docs/white-label.md).
-- Columnas alineadas con packages/shared/src/types/business.ts (BusinessConfig).
-- MVP de un solo negocio: se sembra una unica fila mas abajo, usada por el
-- trigger de 002_profiles.sql para asignar business_id a los usuarios nuevos.

create table public.business (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  logo_url text,
  favicon_url text,
  primary_color text not null default '#0f172a',
  accent_color text not null default '#6366f1',
  phone text,
  whatsapp_number text,
  address text,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.business enable row level security;

-- Lectura publica: la app necesita pintar nombre/logo/colores antes de login.
create policy "business_select_public"
  on public.business
  for select
  using (true);

-- Las policies de escritura (solo BUSINESS_ADMIN/SUPER_ADMIN) se agregan en
-- 002_profiles.sql, una vez que existe la tabla profiles para verificarlas.

insert into public.business (name)
values ('MBA MID');
