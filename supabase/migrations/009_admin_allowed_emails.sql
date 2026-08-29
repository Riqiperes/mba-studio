-- Allowlist de correos que reciben un rol de staff/admin automaticamente al
-- registrarse (via Google OAuth u otro metodo), en vez del CUSTOMER por
-- defecto. El frontend nunca decide esto -- decidirlo en el cliente seria
-- spoofable; la unica fuente de verdad es esta tabla + el trigger de abajo.
create table public.admin_allowed_emails (
  email text primary key,
  role public.user_role not null default 'SUPER_ADMIN',
  created_at timestamptz not null default now(),
  constraint admin_allowed_emails_role_check
    check (role in ('STAFF', 'BUSINESS_ADMIN', 'SUPER_ADMIN'))
);

alter table public.admin_allowed_emails enable row level security;
-- Sin policies a proposito: nadie via las API keys anon/authenticated puede
-- leer ni escribir esta tabla directamente. Solo la tocan el trigger de
-- abajo (SECURITY DEFINER, bypassa RLS) y el SQL editor de Supabase.

-- Actualiza el trigger de creacion de profile (definido en 002_profiles.sql):
-- si el email del que se registra esta en el allowlist, usa ese rol; si no,
-- CUSTOMER como siempre. La logica de negocio (business_id, full_name) no
-- cambia.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_business_id uuid;
  v_role public.user_role;
begin
  select id into v_business_id from public.business order by created_at limit 1;

  select role into v_role from public.admin_allowed_emails where email = new.email;
  if v_role is null then
    v_role := 'CUSTOMER';
  end if;

  insert into public.profiles (id, business_id, role, full_name)
  values (
    new.id,
    v_business_id,
    v_role,
    new.raw_user_meta_data ->> 'full_name'
  );

  return new;
end;
$$;

-- Siembra el primer SUPER_ADMIN.
insert into public.admin_allowed_emails (email, role)
values ('riqiperes14@gmail.com', 'SUPER_ADMIN');

-- Backfill: el profile de ese correo ya existe (de las pruebas de Google
-- OAuth) con role CUSTOMER por defecto; se corrige aqui una sola vez.
-- profiles_prevent_privilege_escalation bloquearia este UPDATE (esta
-- migracion corre sin sesion de usuario, asi que current_user_role() es
-- NULL y el trigger, correctamente, revierte el cambio) -- se desactiva
-- solo para esta linea, dentro de la misma migracion.
alter table public.profiles disable trigger profiles_prevent_privilege_escalation;

update public.profiles
set role = 'SUPER_ADMIN'
where id = (select id from auth.users where email = 'riqiperes14@gmail.com');

alter table public.profiles enable trigger profiles_prevent_privilege_escalation;
