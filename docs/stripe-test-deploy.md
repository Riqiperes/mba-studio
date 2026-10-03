# Stripe para Academia: despliegue, configuracion y pruebas

Guia para dejar funcionando el cobro de Academia (cuota de inscripcion o
colegiatura mensual por Stripe Checkout) en un proyecto de Supabase. Diseno
completo en `docs/payments.md`. El codigo esta en `develop` (PR #24) y
**todavia no esta en `main`**: produccion no tiene Stripe.

La fuente de verdad del codigo es `supabase/functions/` (`stripe-checkout`,
`stripe-webhook`, `stripe-cancel-subscription` y los helpers de
`_shared/`). No se copia codigo a este archivo: las copias se
desincronizaban (paso el 2026-10-02 y se borraron).

## Estado (actualizar al avanzar)

Dev (`eazyblybekyygimqpjjw`, Stripe test mode):

- [x] Migraciones `031_academy_registration_stripe.sql` y
      `032_academy_tuition_stripe_auto_activation.sql`: contenido aplicado
      a mano (SQL Editor), no aparecen en el historial de migraciones.
- [x] Secrets `STRIPE_SECRET_KEY` (`sk_test_...`) y `STRIPE_WEBHOOK_SECRET`.
- [x] Las 3 funciones existen, JWT correcto (apagado solo en
      `stripe-webhook`).
- [ ] **Volver a desplegar las 3 funciones desde el repo**: lo desplegado
      es la version anterior al PR #24, sin los arreglos del webhook
      (reintentos, campos de la API `dahlia`) ni el chequeo de rol de
      `stripe-cancel-subscription`.
- [x] Colegiatura de $900 en `academy_tuition_periods` para "Ballet Infantil A".
- [ ] Webhook de Stripe (test) con los eventos `invoice.paid` e
      `invoice.payment_failed` ademas de `checkout.session.completed`.
- [ ] Prueba completa (seccion "Probar el pago").
- [ ] Stripe -> Settings -> Business -> Public details: cambiar el nombre
      publico "BRANSH" por el del negocio y confirmar que es la cuenta correcta.
- [ ] Decidir el dia de cobro: Stripe cobra el dia 1
      (`billing_cycle_anchor_config` en `stripe-checkout`), pero
      `docs/business-rules.md` dice que la colegiatura vence el dia 10.

Prod (`nnabpthdclgggpxysyxs`): nada hecho. Requiere todo lo de arriba con
llaves **live**, despues de que dev pase la prueba completa, y luego el
merge de `develop` a `main`.

## Desplegar las funciones (CLI, desde la raiz del repo)

El editor del Dashboard no ve `_shared/`, por eso se despliega con la CLI,
que empaqueta los imports relativos:

```bash
npx supabase login
npx supabase functions deploy stripe-checkout --project-ref eazyblybekyygimqpjjw
npx supabase functions deploy stripe-webhook --project-ref eazyblybekyygimqpjjw
npx supabase functions deploy stripe-cancel-subscription --project-ref eazyblybekyygimqpjjw
```

`supabase/config.toml` ya deja `verify_jwt = false` para `stripe-webhook`
(Stripe no manda JWT de Supabase; se autentica con su firma). Despues de
desplegar, confirmar en Dashboard -> Edge Functions que solo
`stripe-webhook` tiene "Enforce JWT Verification" apagado.

## Configuracion (una vez por proyecto)

1. Cuota de inscripcion (SQL Editor; 25000 centavos = $250 MXN):
   ```sql
   update public.business
   set academy_registration_fee_cents = 25000
   where name = 'MBA MID';
   ```
2. Colegiatura por grupo (90000 centavos = $900 MXN/mes). Un grupo sin
   fila activa cobra solo la cuota de inscripcion; con fila activa cobra
   solo la mensualidad. Confirmar nombres con
   `select name from public.academy_groups;` y repetir por grupo:
   ```sql
   insert into public.academy_tuition_periods (business_id, group_id, amount_cents, active)
   select b.id, g.id, 90000, true
   from public.business b
   join public.academy_groups g on g.business_id = b.id
   where b.name = 'MBA MID' and g.name = 'Ballet Infantil A'
   on conflict (group_id) do update set amount_cents = excluded.amount_cents, active = true;
   ```
3. Secrets en Project Settings -> Edge Functions -> Secrets:
   `STRIPE_SECRET_KEY` (`sk_test_...` en dev, `sk_live_...` solo en prod).
4. Webhook en Stripe (test: dashboard.stripe.com/test/webhooks) con URL
   `https://<project-ref>.supabase.co/functions/v1/stripe-webhook` y los
   eventos `checkout.session.completed`, `invoice.paid` e
   `invoice.payment_failed`. Su "Signing secret" (`whsec_...`) va como
   secret `STRIPE_WEBHOOK_SECRET`. Agregar eventos a un endpoint existente
   no cambia el `whsec_`.

## Probar el pago (dev, test mode)

1. Iniciar sesion en `apps/web`, ir a `/academy`, elegir un grupo y
   "Pagar inscripción e inscribir".
2. En Stripe Checkout debe aparecer **un solo concepto**: la mensualidad
   si el grupo tiene colegiatura, o la cuota de inscripcion si no.
   Tarjeta de prueba `4242 4242 4242 4242`, fecha futura, cualquier CVC.
3. Regresa a `/profile?pago=procesando`. En segundos la inscripcion debe
   verse `ACTIVA` en "Mis alumnos e inscripciones" (o `RECHAZADA` y con el
   cargo reembolsado en Stripe -> Payments si ya no habia cupo).
4. Caso sin cupo: bajar `max_capacity` del grupo a un numero ya alcanzado
   antes de pagar.
5. Cobro mensual: en Stripe test -> Subscriptions, "Advance clock" en la
   suscripcion; debe registrarse un `academy_payments` con
   `payment_method = 'STRIPE'` y `status = 'PAGADO'`.
6. Baja desde admin: dar de baja al alumno debe cancelar la suscripcion
   en Stripe (solo staff puede; un cliente recibe 403).
7. Si algo falla: Dashboard -> Edge Functions -> `<funcion>` -> Logs. Si el
   webhook responde 500, Stripe reintenta solo (el evento no queda marcado
   como procesado).

Nunca usar tarjetas reales con llaves de test, ni llaves live para probar.
