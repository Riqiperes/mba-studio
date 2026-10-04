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

- **Dos proyectos de Supabase**: desarrollo/staging (`eazyblybekyygimqpjjw`,
  lo usan `npm run dev` y los preview deployments de Cloudflare Pages) y
  produccion (`nnabpthdclgggpxysyxs`, solo el entorno "Production" de
  Cloudflare Pages). Cada migracion, plantilla de correo, SMTP, secret y
  Edge Function se aplica en los dos por separado.
- **Check "Supabase Preview" en GitHub**: falla en cada PR con "Remote
  migration versions not found in local migrations directory". La
  integracion de GitHub de Supabase compara el historial de migraciones
  del proyecto (versiones con fecha, porque se aplicaron desde el
  Dashboard/MCP) con los archivos del repo (`001_...`, `002_...`), que
  nunca coinciden. No afecta a Cloudflare ni a la base de datos. Como no
  se usan las ramas de preview de Supabase, lo simple es desconectarla:
  Dashboard del proyecto conectado > Project Settings > Integrations >
  GitHub > desconectar (o apagar "Supabase changes only"/branching).
  Alinear el historial requeriria `supabase migration repair` en cada
  proyecto; no vale la pena mientras no se usen preview branches.
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

Dos proyectos de Supabase:

- `MBA-STUDIO` (`eazyblybekyygimqpjjw`): desarrollo/staging compartido,
  usado por `npm run dev` local y por los preview deployments.
- `MBA-STUDIO-PROD` (`nnabpthdclgggpxysyxs`): produccion, creado para poder
  mostrarle el MVP al cliente sin exponer la base de desarrollo. Tiene las
  29 migraciones aplicadas y datos demo minimos sembrados (1 instructor,
  2 paquetes, 3 clases de Studio, 1 grupo de Academia) para que no se vea
  vacio en la presentacion. URL: `https://nnabpthdclgggpxysyxs.supabase.co`.
  Sin Edge Functions desplegadas todavia (nada en el frontend las llama
  activamente hoy: WhatsApp/notifications siguen en `mock`, Stripe no esta
  integrado) -- desplegarlas cuando se conecten de verdad.

Ningun proyecto de Cloudflare Pages configurado todavia (wrangler no esta
autenticado en este entorno). Pasos manuales pendientes para terminar el
deploy a produccion:

1. En el dashboard de Cloudflare Pages, crear los 2 proyectos como describe
   la tabla de arriba (Root directory = raiz del repo), conectados a
   `Riqiperes/mba-studio`, **rama de produccion = `main`**.
2. Variables de entorno **Production** (usar el proyecto `MBA-STUDIO-PROD`):
   - `VITE_SUPABASE_URL=https://nnabpthdclgggpxysyxs.supabase.co`
   - `VITE_SUPABASE_ANON_KEY=<anon key de MBA-STUDIO-PROD, ver Supabase
     dashboard > Settings > API>`
   - `VITE_APP_ENV=production`
   - `VITE_STRIPE_PUBLIC_KEY=` (vacio, sin Stripe live todavia)
   - `VITE_ADMIN_URL` (en web) y `VITE_WEB_URL` (en admin): URL de produccion
     del otro proyecto, para los botones "Panel" / "Ver sitio". Vacio = sin boton.
3. Variables de entorno **Preview** (proyecto `MBA-STUDIO` de siempre,
   igual que `.env` local).
4. En Supabase Auth del proyecto `MBA-STUDIO-PROD`: habilitar el provider
   de Google OAuth y agregar su URL de callback
   (`https://nnabpthdclgggpxysyxs.supabase.co/auth/v1/callback`) a los
   Authorized redirect URIs del cliente OAuth en Google Cloud Console --
   es un proyecto nuevo, no hereda la config de `MBA-STUDIO`. Sin esto el
   login con Google no funciona en produccion (email/password si funciona
   por defecto).
5. Verificar login real (Google y/o email/password) contra
   `MBA-STUDIO-PROD` antes de la demo con el cliente.

Ver `docs/CURRENT_STATE.md` para el detalle de que se aplico y cuando.
