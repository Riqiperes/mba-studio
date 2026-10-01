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
   de esa funcion, seleccionando `checkout.session.completed`,
   `invoice.paid` e `invoice.payment_failed` (los dos ultimos son
   necesarios para la colegiatura recurrente, ver mas abajo).
3. Copiar el "Signing secret" generado a `STRIPE_WEBHOOK_SECRET` (secret de
   Supabase, no `.env` del frontend).
4. Verificar con el CLI de Stripe (`stripe listen --forward-to ...`) en
   desarrollo antes de ir a produccion.

## Colegiatura recurrente de Academia (Stripe Subscriptions)

Si un grupo tiene una fila activa en `academy_tuition_periods`,
`stripe-checkout` cobra **solo la colegiatura mensual** (precio
recurrente, modo `subscription`) -- la cuota de inscripcion unica NO se
cobra por separado en ese caso (decision de negocio). Si el grupo no tiene
colegiatura configurada, se cobra la cuota de inscripcion unica de
siempre (modo `payment`), sin cambios.

Todos los alumnos con colegiatura por Stripe se facturan el **dia 1 de
cada mes** (`billing_cycle_anchor_config.day_of_month = 1`), sin importar
el dia en que se inscribieron -- decision de negocio, ver
`docs/business-rules.md`. Sin `proration_behavior` explicito, Stripe usa
el default (`create_prorations`): el primer cobro es **prorateado** por
los dias restantes hasta el dia 1 (puede ser casi el monto completo si
falta poco para esa fecha); los cobros siguientes son el monto completo.

`stripe-webhook` escucha ademas:
- `invoice.paid`: registra el cobro en `academy_payments` (mismo lugar que
  usa el staff para pagos manuales, `payment_method = 'STRIPE'`, el
  `invoice.id` de Stripe va en la columna `reference`).
- `invoice.payment_failed`: marca esa colegiatura como `NO_PAGADO` -- cae
  en la misma vista de "Atrasados" que ya usa el staff.

### Activacion automatica y reembolso (sin esperar al staff)

Al confirmar el pago, `stripe-webhook` intenta activar la inscripcion
(`PENDIENTE` -> `ACTIVA`) de inmediato, reutilizando el trigger
`enforce_academy_enrollment_capacity_and_age` (migracion 023) que ya
valida cupo y edad del grupo:

- **Si hay cupo** -> se activa al instante, sin aprobacion manual.
- **Si ya no hay cupo** (o el alumno no cumple la edad) -> se reembolsa el
  pago automaticamente (`stripe.refunds.create`), se cancela la
  suscripcion si llego a crearse, y la solicitud queda en estado
  `RECHAZADA`.

Cuando el staff da de baja a un alumno (`withdrawEnrollment` en
`apps/admin`), se llama a la Edge Function `stripe-cancel-subscription`
para cancelar su suscripcion y no seguir cobrandole (best-effort: si
falla, la baja igual se guarda y el fallo solo se loguea).

## Errores de pago

Los errores de Stripe (tarjeta rechazada, sesion expirada, etc.) se
muestran al usuario de forma clara sin exponer detalles internos, siguiendo
el patron general de manejo de errores (ver `docs/security.md`).

## Estado actual

Implementado para la cuota de inscripción de Academia + colegiatura
mensual recurrente (migraciones `030_academy_registration_stripe.sql` y
`031_academy_tuition_stripe_auto_activation.sql`, Edge Functions
`supabase/functions/stripe-checkout/`, `supabase/functions/stripe-webhook/`
y `supabase/functions/stripe-cancel-subscription/`). Idempotencia via
tabla `stripe_events`. Modo test de Stripe. Pendiente: cargar
`STRIPE_SECRET_KEY`/`STRIPE_WEBHOOK_SECRET` como secrets de Supabase,
(re)desplegar las 3 funciones con el código actualizado, agregar
`invoice.paid`/`invoice.payment_failed` al webhook endpoint existente en
Stripe, configurar `academy_tuition_periods` para los grupos de Ballet
($900 MXN/mes), y probar con una tarjeta de test (ver
`docs/CURRENT_STATE.md` y `docs/stripe-test-deploy.md`). El cobro de
paquetes de Studio (Checkout genérico) todavia no esta conectado --
`stripe-checkout` hoy solo sabe crear la sesión para `academy_enrollments`;
hay que generalizarla (o agregar una función nueva) cuando se implemente
ese flujo.
