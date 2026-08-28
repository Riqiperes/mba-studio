# stripe-checkout

Edge Function que recibe `{ packageId }` (o `{ enrollmentId }` para
colegiaturas) del usuario autenticado, crea una Stripe Checkout Session y
devuelve la URL de redireccion. No otorga creditos ni marca pagos: eso lo
hace unicamente `stripe-webhook` cuando Stripe confirma el pago. Ver
`docs/payments.md`. Sin implementar todavia.
