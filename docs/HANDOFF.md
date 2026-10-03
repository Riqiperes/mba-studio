# Handoff — 2026-10-03

Resumen corto para retomar. El detalle vive en `docs/CURRENT_STATE.md`
(entradas del 2026-10-01 al 2026-10-03); este archivo solo dice donde
quedo el trabajo y que sigue.

## Estado de las ramas

- `main` (produccion, Cloudflare Pages): rediseno de web y admin, "Nuevo
  cliente" de Studio, ver contrasena y requisitos al registrarse, tema
  claro/oscuro, condicion medica en reservados. Sin Stripe.
- `develop`: lo mismo mas Stripe para Academia (#24). `main` ya se
  sincronizo de vuelta en `develop`.

## Pendiente manual (no es codigo)

1. Supabase, dev y prod: pegar `supabase/templates/confirm-signup.html` en
   Authentication > Emails > Templates > "Confirm signup" (el SMTP con
   Resend ya esta configurado) y probar un registro.
2. Supabase, dev y prod: Authentication > Providers > Email, contrasena
   minima 8 y "Letters and digits".
3. Stripe en dev: volver a desplegar las 3 funciones desde el repo y
   terminar la checklist de `docs/stripe-test-deploy.md`. Despues, prod.
4. Decidir el dia de cobro de la colegiatura (Stripe cobra el 1; las
   reglas de negocio dicen el 10).

## Como se trabaja aqui

- Ramas `feat/`/`fix/`/`docs/` desde `develop`, PR a `develop`, merge con
  "Create a merge commit". A `main` solo por PR.
- Para sacar a produccion sin una feature que sigue en pruebas: ver
  `docs/git-workflow.md` > "Sacar a produccion sin una feature".
- Checks antes de cerrar: `npm run typecheck`, `npm run lint`,
  `npm test`, `npm run build`, y `deno check` para Edge Functions (ver
  `docs/development.md`).
