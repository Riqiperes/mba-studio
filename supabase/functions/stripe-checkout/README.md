# stripe-checkout

Edge Function que recibe `{ enrollmentId }` de un usuario autenticado, crea
una Stripe Checkout Session para la cuota de inscripcion de Academia y
devuelve la URL de redireccion. No otorga creditos ni marca pagos: eso lo
hace unicamente `stripe-webhook` cuando Stripe confirma el pago. Ver
`docs/payments.md`.

Secrets requeridos (Supabase Project Settings -> Edge Functions -> Secrets):
`STRIPE_SECRET_KEY`.
