# Pagos (Stripe)

## Principio central

**Stripe esta desacoplado del frontend.** El frontend nunca decide que un
pago se realizo: solo Stripe, via webhook verificado, puede confirmar un
pago y disparar el otorgamiento de creditos o la activacion de una
inscripcion.

## Flujo

```
Customer selecciona paquete
        v
apps/web llama a la Edge Function stripe-checkout
        v
stripe-checkout crea una Stripe Checkout Session y devuelve la URL
        v
Redirect a Stripe Checkout (hosted)
        v
Customer paga
        v
Stripe envia evento al webhook (checkout.session.completed / payment_intent.succeeded)
        v
stripe-webhook verifica la firma (STRIPE_WEBHOOK_SECRET)
        v
Actualiza payments, otorga creditos / activa inscripcion
```

## Idempotencia (obligatorio)

Los webhooks de Stripe pueden llegar mas de una vez para el mismo evento.

```
Webhook recibido
    v
Existe ya un registro para este stripe_event_id?
    v
Si  -> ignorar (log, responder 200)
No  -> procesar y guardar stripe_event_id
```

Nunca debe pasar:

```
Webhook 1        -> +8 creditos
Webhook duplicado -> +8 creditos   (INCORRECTO)
```

Correcto:

```
Webhook 1        -> +8 creditos
Webhook duplicado -> ignorado
```

Para lograrlo, `payments` (o una tabla `stripe_events` dedicada) guarda el
`event.id` de Stripe con una constraint `unique`, y el insert de un evento
repetido falla/se ignora antes de tocar creditos.

## Secret keys

- `STRIPE_SECRET_KEY` y `STRIPE_WEBHOOK_SECRET` viven solo como secrets de
  Supabase Edge Functions. Nunca en el frontend, nunca en variables
  `VITE_*`.
- `VITE_STRIPE_PUBLIC_KEY` es la unica clave de Stripe que el frontend
  necesita, y solo si se usa Stripe.js del lado cliente (con Stripe
  Checkout hosted, ni siquiera es estrictamente necesaria, pero se deja
  preparada por si se necesita Stripe Elements en el futuro).

## Configuracion del webhook

1. Desplegar la Edge Function `stripe-webhook`.
2. En el dashboard de Stripe, crear un endpoint apuntando a la URL publica
   de esa funcion, seleccionando al menos `checkout.session.completed` (y
   `payment_intent.payment_failed` para manejar fallos).
3. Copiar el "Signing secret" generado a `STRIPE_WEBHOOK_SECRET` (secret de
   Supabase, no `.env` del frontend).
4. Verificar con el CLI de Stripe (`stripe listen --forward-to ...`) en
   desarrollo antes de ir a produccion.

## Errores de pago

Los errores de Stripe (tarjeta rechazada, sesion expirada, etc.) se
muestran al usuario de forma clara sin exponer detalles internos, siguiendo
el patron general de manejo de errores (ver `docs/security.md`).

## Estado actual

No implementado todavia. `supabase/functions/stripe-checkout/` y
`supabase/functions/stripe-webhook/` existen como carpetas preparadas con
un README describiendo su responsabilidad. Se implementa en la etapa
"Stripe" / "Payments" del roadmap.
