# supabase/functions

Edge Functions de Supabase (Deno). Cada subcarpeta es una funcion
desplegable independiente; `_shared/` contiene codigo comun importado por
varias funciones (nunca al reves).

## Funciones preparadas (estructura, sin implementar todavia)

- `stripe-checkout/` - crea una Stripe Checkout Session para comprar un
  paquete o pagar una colegiatura. Ver `docs/payments.md`.
- `stripe-webhook/` - recibe y verifica eventos de Stripe, es la unica
  fuente de verdad para confirmar un pago y otorgar creditos. Ver
  `docs/payments.md`.
- `notifications/` - genera y despacha notificaciones (nuevo pago,
  confirmacion, recordatorio, lista de espera, cancelacion, pago atrasado,
  baja). Ver `docs/notifications.md`.
- `send-whatsapp/` - envia un mensaje de WhatsApp a traves del
  `WhatsAppProvider` activo (`WHATSAPP_PROVIDER`). Ver `docs/whatsapp.md`.
- `send-email/` - envia un correo a traves del `EmailProvider` activo.

## `_shared/`

Codigo compartido entre funciones, por ejemplo (a crear cuando se
implementen las funciones):

- `supabaseAdmin.ts` - cliente de Supabase con `SERVICE_ROLE_KEY`, solo para
  uso server-side.
- `stripe.ts` - inicializacion del SDK de Stripe.
- `logger.ts` - logging estructurado, nunca imprime secretos.
- `validators.ts` - validacion de payloads con Zod.
- `responses.ts` - formato consistente de respuestas/errores HTTP.

## Estado actual

Solo estructura de carpetas, sin codigo todavia. Se implementa en la etapa
"Stripe" / "Notifications" / "WhatsApp" del roadmap (`docs/roadmap.md`).
