# stripe-cancel-subscription

Edge Function que cancela la suscripcion de Stripe de una inscripcion de
Academia. La llama `apps/admin` (`withdrawEnrollment`) cuando el staff da
de baja a un alumno, para no seguir cobrando la colegiatura mensual a
alguien que ya no es alumno activo. Si la inscripcion no tiene suscripcion
(grupo sin colegiatura via Stripe), responde `{ cancelled: false }` sin
error. Ver `docs/payments.md`.

Secrets requeridos (Supabase Project Settings -> Edge Functions -> Secrets):
`STRIPE_SECRET_KEY`.
