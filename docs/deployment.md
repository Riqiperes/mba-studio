# Deployment

## Frontend — Cloudflare Pages

Dos proyectos de Cloudflare Pages, uno por app, **ambos con Root directory
= raiz del repo** (no `apps/web` ni `apps/admin`). Esto es importante en un
monorepo con npm workspaces: si el Root directory fuera `apps/web`,
Cloudflare correria `npm install` solo ahi, y fallaria al no poder resolver
`@mba-studio/shared` (que se resuelve via el workspace en la raiz).

| App | Root directory | Build command | Build output directory |
|---|---|---|---|
| `apps/web` | `/` (raiz del repo) | `npm install && npm run build:web` | `apps/web/dist` |
| `apps/admin` | `/` (raiz del repo) | `npm install && npm run build:admin` | `apps/admin/dist` |

Pasos en el dashboard de Cloudflare (Workers & Pages > Create > Pages >
Connect to Git):

1. Conectar el repo de GitHub `Riqiperes/mba-studio` (autoriza el acceso
   una sola vez, cubre ambos proyectos).
2. Crear el proyecto para `apps/web` con la configuracion de la tabla de
   arriba.
3. Repetir para `apps/admin`.
4. En cada proyecto, agregar las variables `VITE_*` necesarias (ver
   `.env.example`) en **Settings > Environment variables**, tanto para
   "Production" como para "Preview" (pueden apuntar al mismo proyecto de
   Supabase mientras no exista un Supabase de produccion separado — ver
   seccion "Backend — Supabase" abajo).

Notas:

- **Preview deployments**: Cloudflare Pages despliega automaticamente cada
  push a cualquier branch (y cada Pull Request) con su propia URL de
  preview, ademas de la URL de produccion en `main`. Esto es lo que le da
  al equipo una URL para probar cada commit sin instalar nada localmente.
- Nunca poner secretos (`STRIPE_SECRET_KEY`, `SUPABASE_SERVICE_ROLE_KEY`,
  etc.) como variable de Cloudflare Pages del frontend: esas solo viven
  como secrets de Supabase Edge Functions (ver `docs/payments.md`).
- Dominio: cada app puede tener su propio subdominio (ej. `app.mba-mid.com`
  para clientes, `admin.mba-mid.com` para el panel), configurable despues
  en Cloudflare una vez que el deploy basico funcione.

## Backend — Supabase

- **Por ahora, un solo proyecto de Supabase** sirve como backend
  compartido de desarrollo/staging: tanto `npm run dev` en local como los
  preview deployments de Cloudflare Pages apuntan a el. Es la opcion mas
  simple mientras el equipo es chico y no hay datos reales de clientes.
- **Antes de operar con clientes/pagos reales**, crear un **segundo
  proyecto de Supabase** dedicado a produccion, aplicarle las mismas
  migraciones, y apuntar solo el entorno "Production" de Cloudflare Pages
  ahi (Preview y desarrollo local siguen usando el proyecto de
  desarrollo/staging).
- Migraciones aplicadas via Supabase CLI (`supabase db push` o
  `supabase migration up`) o via el MCP de Supabase en un flujo asistido.
- Edge Functions desplegadas con `supabase functions deploy <nombre>`.
- Secrets de Edge Functions configurados con
  `supabase secrets set NOMBRE=valor` (o desde el dashboard), nunca
  committeados.

## Stripe

- Modo test durante desarrollo, modo live solo cuando el negocio este listo
  para cobrar de verdad.
- El webhook de produccion apunta a la URL publica de la Edge Function
  `stripe-webhook` desplegada en Supabase.

## Checklist minimo antes de un deploy a produccion

1. `npm run build` completo (web + admin) sin errores.
2. `npm run typecheck` sin errores.
3. `npm run lint` sin errores nuevos.
4. Migraciones de `supabase/migrations/` aplicadas al proyecto de Supabase
   correspondiente.
5. Variables de entorno / secrets configurados en Cloudflare Pages y
   Supabase (no solo en `.env` local).
6. Webhook de Stripe apuntando al endpoint correcto y probado con al menos
   un evento real o simulado (`stripe trigger checkout.session.completed`).

## Estado actual

Existe un proyecto de Supabase (`MBA-STUDIO`, sin tablas/migraciones
todavia) que se usa como backend de desarrollo/staging compartido. Ningun
proyecto de Cloudflare Pages configurado todavia. Ver
`docs/CURRENT_STATE.md` para el estado exacto.
