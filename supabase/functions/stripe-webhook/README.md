# stripe-webhook

Edge Function que recibe los eventos de Stripe, verifica la firma con
`STRIPE_WEBHOOK_SECRET`, y es la unica fuente de verdad para marcar un pago
como confirmado y otorgar creditos/activar inscripcion. Debe ser
idempotente: un evento repetido nunca debe otorgar creditos dos veces (ver
`docs/payments.md`). Sin implementar todavia.
