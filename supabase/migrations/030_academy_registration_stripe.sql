-- supabase/migrations/030_academy_registration_stripe.sql
-- Conecta el cobro de la cuota de inscripcion de Academia a Stripe Checkout
-- (etapa 14 del roadmap), reemplazando el pago dummy de 027/028. Ver
-- docs/payments.md y docs/superpowers/specs/2026-09-09-academy-self-enrollment-and-admin-visibility-design.md.
--
-- 1. La policy de insert de autoservicio (027, ajustada en 028) permitia
--    que el cliente insertara su propia solicitud con
--    registration_fee_paid = true -- aceptable mientras el pago era dummy,
--    pero con Stripe real el pago SOLO lo confirma stripe-webhook (con la
--    service role key, que bypassa RLS). Se agrega
--    registration_fee_paid = false al with check para cerrar ese hueco.
-- 2. Columna para trazabilidad: que sesion de Stripe Checkout confirmo el
--    pago de cada inscripcion (la fija unicamente stripe-webhook).
-- 3. Tabla stripe_events: idempotencia de webhooks (docs/payments.md). Solo
--    la toca stripe-webhook con la service role key; RLS habilitado sin
--    ninguna policy para que ningun rol de cliente pueda leerla/escribirla.

drop policy if exists "academy_enrollments_customer_insert_own" on public.academy_enrollments;
create policy "academy_enrollments_customer_insert_own"
  on public.academy_enrollments
  for insert
  with check (
    status in ('PENDIENTE', 'MUESTRA')
    and business_id = public.current_user_business_id()
    and registration_fee_paid = false
    and exists (
      select 1 from public.dependents d
      where d.id = dependent_id and d.guardian_id = auth.uid()
    )
  );

alter table public.academy_enrollments
  add column if not exists registration_fee_stripe_session_id text;

create table public.stripe_events (
  id text primary key, -- Stripe event.id, ej. "evt_1AbCdE..."
  type text not null,
  created_at timestamptz not null default now()
);

alter table public.stripe_events enable row level security;
-- Sin policies: solo la service role key (bypassa RLS) puede leer/escribir.
