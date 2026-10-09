# Funciones de Stripe para pegar en el Dashboard de Supabase

Versiones autocontenidas (helpers de `_shared/` inline) de `stripe-checkout`
y `stripe-webhook`, una por entorno:

| Archivo | Proyecto de Supabase | Keys de Stripe | JWT verification |
|---|---|---|---|
| `stripe-checkout.test.ts` | `MBA-STUDIO` (`eazyblybekyygimqpjjw`) | test | activada |
| `stripe-webhook.test.ts` | `MBA-STUDIO` (`eazyblybekyygimqpjjw`) | test | **desactivada** |
| `stripe-checkout.production.ts` | `MBA-STUDIO-PROD` (`nnabpthdclgggpxysyxs`) | live | activada |
| `stripe-webhook.production.ts` | `MBA-STUDIO-PROD` (`nnabpthdclgggpxysyxs`) | live | **desactivada** |

La logica es identica en ambos: lo unico que cambia es la constante
`STRIPE_MODE` (`"test"` / `"live"`). Es un candado: si en un proyecto se
carga por error la key del otro modo, la funcion se niega a operar (y el
webhook rechaza eventos del otro modo) en vez de cobrar en el lugar
equivocado.

## Orden

1. Pegar las versiones `.test.ts` en `MBA-STUDIO` y probar todo el flujo
   (ver "Probar el pago" en `docs/stripe-test-deploy.md`).
2. Cuando todo pase, pegar las versiones `.production.ts` en
   `MBA-STUDIO-PROD` y seguir la seccion "Produccion" de
   `docs/stripe-rollout-checklist.md`.

`stripe-cancel-subscription` no tiene version por entorno: se pega igual
en los dos proyectos (seccion 2.3 de `docs/stripe-rollout-checklist.md`).

Si cambia la logica en `supabase/functions/stripe-*/index.ts`, hay que
actualizar los 4 archivos (y los bloques de `docs/stripe-rollout-checklist.md`
y `docs/stripe-test-deploy.md`).
