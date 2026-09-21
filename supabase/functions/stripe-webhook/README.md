# stripe-webhook

Edge Function que recibe los eventos de Stripe, verifica la firma con
`STRIPE_WEBHOOK_SECRET`, y es la unica fuente de verdad para marcar la
cuota de inscripcion de Academia como pagada. Idempotente via la tabla
`stripe_events` (migracion 030): un evento repetido nunca vuelve a marcar
nada. Ver `docs/payments.md`.

Se despliega con `verify_jwt = false` (`supabase/config.toml`): Stripe la
llama directo, sin JWT de Supabase.

Secrets requeridos (Supabase Project Settings -> Edge Functions -> Secrets):
`STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`.
