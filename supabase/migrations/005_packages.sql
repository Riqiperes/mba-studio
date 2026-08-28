-- Tabla packages: paquetes de clases (ver docs/database.md, docs/business-rules.md).

create table public.packages (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.business (id),
  name text not null,
  description text,
  credits integer not null check (credits > 0),
  price_cents integer not null check (price_cents >= 0),
  currency text not null default 'MXN',
  valid_days integer check (valid_days > 0),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index packages_business_id_idx on public.packages (business_id);

alter table public.packages enable row level security;

-- Lectura publica solo de paquetes activos (catalogo/precios); el resto
-- (paquetes descontinuados) solo lo ve el staff a traves de la policy de abajo.
create policy "packages_select_active_public"
  on public.packages
  for select
  using (active);

create policy "packages_manage_staff"
  on public.packages
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
