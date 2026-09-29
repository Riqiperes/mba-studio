-- supabase/migrations/031_academy_tuition_stripe_auto_activation.sql
-- Colegiatura recurrente por Stripe Subscriptions + activacion automatica
-- de la cuota de inscripcion (sin esperar aprobacion del staff) cuando hay
-- cupo. Ver docs/payments.md.
--
-- 1. Nuevo estado RECHAZADA: la inscripcion se pago pero al momento de
--    confirmar (stripe-webhook) ya no habia cupo o el alumno no cumplia
--    la edad del grupo -- se reembolsa automaticamente y se marca asi.
--    Distinto de BAJA (alguien que SI llego a estar ACTIVA y se dio de
--    baja despues).
alter table public.academy_enrollments
  drop constraint if exists academy_enrollments_status_check;
alter table public.academy_enrollments
  add constraint academy_enrollments_status_check
  check (status in ('ACTIVA', 'BAJA', 'PENDIENTE', 'MUESTRA', 'RECHAZADA'));

-- 2. Columnas para el flujo automatico:
--    - registration_fee_stripe_payment_intent_id: para poder reembolsar
--      el pago inicial si no hay cupo.
--    - registration_fee_refunded_at: cuando se reembolso (si aplica).
--    - stripe_subscription_id / stripe_customer_id: la colegiatura
--      recurrente de esta inscripcion (si el grupo tiene
--      academy_tuition_periods activo). Se usa tambien para cancelar la
--      suscripcion cuando el staff da de baja al alumno.
alter table public.academy_enrollments
  add column if not exists registration_fee_stripe_payment_intent_id text,
  add column if not exists registration_fee_refunded_at timestamptz,
  add column if not exists stripe_subscription_id text,
  add column if not exists stripe_customer_id text;

-- 3. academy_payments: 'STRIPE' como metodo de pago, ademas de los
--    manuales (EFECTIVO/TRANSFERENCIA/OTRO) que el staff sigue pudiendo
--    usar sin cambios (coexisten). El invoice de Stripe se guarda en la
--    columna `reference` que ya existia (sin agregar columna nueva).
alter table public.academy_payments
  drop constraint if exists academy_payments_payment_method_check;
alter table public.academy_payments
  add constraint academy_payments_payment_method_check
  check (payment_method in ('EFECTIVO', 'TRANSFERENCIA', 'OTRO', 'STRIPE'));
