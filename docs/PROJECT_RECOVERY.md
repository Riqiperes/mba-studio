# Project Recovery

Guia completa para reconstruir este proyecto desde cero: perdida de la
computadora, perdida de `node_modules`, clonacion en otro equipo, perdida
de configuracion local, cuenta de desarrollador nueva, servidor nuevo, o
deployment nuevo. Esta guia **no depende de nada que solo exista en la
memoria de un asistente de IA**: cualquier desarrollador con acceso al
repositorio de GitHub y a las cuentas de Supabase/Stripe del negocio debe
poder seguirla de punta a punta.

## 0. Que necesitas antes de empezar

- Acceso al repositorio de GitHub: `https://github.com/Riqiperes/mba-studio`.
- Acceso a la cuenta de Supabase del proyecto (o permisos para crear uno
  nuevo si tambien se perdio).
- Acceso a la cuenta de Stripe del negocio (modo test y, cuando aplique,
  modo live).
- Credenciales de Google Cloud Console si se va a reconfigurar Google
  OAuth desde cero.
- Cuenta de Cloudflare (Pages) para el deploy del frontend.

## 1. Instalar herramientas necesarias

- **Git**: https://git-scm.com/downloads
- **Node.js `>= 20.19.0`**: https://nodejs.org (o via `nvm`: `nvm install`
  leyendo `.nvmrc` desde la raiz del repo una vez clonado).
- **npm**: incluido con Node.js. Este proyecto usa npm workspaces, no
  pnpm ni yarn.
- **Supabase CLI** (opcional pero recomendado):
  `npm install -g supabase` (o el metodo de tu sistema operativo, ver
  https://supabase.com/docs/guides/cli).
- **Stripe CLI** (opcional, util para probar webhooks localmente):
  https://stripe.com/docs/stripe-cli

Verificar instalacion:

```bash
git --version
node -v
npm -v
supabase --version   # opcional
stripe --version      # opcional
```

## 2. Clonar el repositorio

```bash
git clone https://github.com/Riqiperes/mba-studio.git
cd mba-studio
```

## 3. Instalar dependencias

```bash
npm install
```

Esto instala las dependencias de `apps/web`, `apps/admin` y
`packages/shared` de una sola vez (npm workspaces).

> Nota: si este es el primer `npm install` que se corre sobre este
> scaffolding (ver `docs/CURRENT_STATE.md`, seccion "Known Issues"), puede
> que alguna version puntual de una dependencia necesite un ajuste menor.
> Si `npm install` falla por un conflicto de versiones, revisar el mensaje
> de error, ajustar la version senalada en el `package.json`
> correspondiente, y volver a correr `npm install`.

## 4. Configurar variables de entorno

```bash
cp .env.example apps/web/.env
cp .env.example apps/admin/.env
```

Llenar los valores reales siguiendo los comentarios de cada variable en
`.env.example`. Como minimo, para levantar el frontend en modo lectura
necesitas `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` (paso 5).

## 5. Crear/configurar el proyecto de Supabase

Si el proyecto de Supabase todavia existe (solo se perdio la maquina
local):

1. Entrar a https://supabase.com/dashboard y ubicar el proyecto del
   negocio.
2. Ir a **Project Settings > API** y copiar `Project URL` y
   `anon public key` a `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` en
   ambos `.env`.
3. Copiar tambien la `service_role key` (Project Settings > API) — se usa
   **solo** como secret de Edge Functions (paso 9), nunca en `.env` del
   frontend.

Si hay que crear el proyecto de Supabase desde cero:

1. https://supabase.com/dashboard/new
2. Elegir nombre, contrasena de base de datos (guardarla en un lugar
   seguro), region (la mas cercana al negocio).
3. Una vez creado, repetir los pasos 2-3 de arriba.

## 6. Ejecutar migraciones

Con Supabase CLI instalado y el proyecto creado:

```bash
supabase login
supabase link --project-ref <tu-project-ref>   # el ref esta en la URL del dashboard
supabase db push                                  # aplica todas las migraciones de supabase/migrations/
```

Si `supabase/migrations/` esta vacio (proyecto recien scaffoldeado, ver
`docs/CURRENT_STATE.md`), este paso no aplica todavia — se vuelve relevante
en cuanto existan migraciones reales.

Alternativa sin CLI: usar el SQL editor del dashboard de Supabase y correr
cada archivo de `supabase/migrations/` en orden numerico.

## 7. Configurar Auth (email/password)

Viene habilitado por defecto en un proyecto nuevo de Supabase
(Authentication > Providers > Email). Revisar que estan activas las
opciones que se quieran usar (confirmacion de email, etc.) segun
`docs/authentication.md`.

## 8. Configurar Google OAuth

1. Ir a Google Cloud Console (https://console.cloud.google.com/), crear
   (o reutilizar) un proyecto.
2. **APIs & Services > Credentials > Create Credentials > OAuth client
   ID**, tipo "Web application".
3. En "Authorized redirect URIs" agregar:
   `https://<project-ref>.supabase.co/auth/v1/callback`
   (el `project-ref` esta en la URL del dashboard de Supabase).
4. En "Authorized JavaScript origins" agregar los dominios de `apps/web` y
   `apps/admin` (incluyendo `http://localhost:5173` y
   `http://localhost:5174` para desarrollo).
5. Copiar el Client ID y Client Secret generados.
6. En el dashboard de Supabase: **Authentication > Providers > Google**,
   pegar Client ID y Client Secret, guardar.

Detalle adicional en `docs/authentication.md`.

## 9. Configurar Stripe

1. Entrar a https://dashboard.stripe.com (modo test mientras no se vaya a
   produccion).
2. **Developers > API keys**: copiar la "Publishable key" a
   `VITE_STRIPE_PUBLIC_KEY` y la "Secret key" para el paso siguiente
   (nunca al `.env` del frontend).
3. Configurar el secret de la Edge Function en Supabase:
   ```bash
   supabase secrets set STRIPE_SECRET_KEY=sk_test_...
   supabase secrets set SUPABASE_SERVICE_ROLE_KEY=...
   supabase secrets set SUPABASE_URL=https://<project-ref>.supabase.co
   ```
4. Desplegar las Edge Functions de pagos (una vez que existan, ver
   `docs/roadmap.md`):
   ```bash
   supabase functions deploy stripe-checkout
   supabase functions deploy stripe-webhook
   ```

## 10. Configurar Webhooks de Stripe

1. En el dashboard de Stripe: **Developers > Webhooks > Add endpoint**.
2. URL: la URL publica de la Edge Function `stripe-webhook` desplegada
   (formato `https://<project-ref>.functions.supabase.co/stripe-webhook`).
3. Eventos a escuchar: al menos `checkout.session.completed`
   (y `payment_intent.payment_failed` para manejar fallos).
4. Copiar el "Signing secret" (`whsec_...`) generado:
   ```bash
   supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_...
   ```
5. Probar en local con Stripe CLI antes de confiar en produccion:
   ```bash
   stripe listen --forward-to https://<project-ref>.functions.supabase.co/stripe-webhook
   stripe trigger checkout.session.completed
   ```

Ver `docs/payments.md` para el detalle de idempotencia.

## 11. Configurar WhatsApp

1. Elegir proveedor real (`meta`, `twilio`, o `ultramsg` — ver
   `docs/whatsapp.md`).
2. Obtener las credenciales de ese proveedor (API key, phone number id,
   etc. segun el proveedor).
3. Configurar como secrets de Supabase:
   ```bash
   supabase secrets set WHATSAPP_PROVIDER=meta
   supabase secrets set WHATSAPP_API_KEY=...
   supabase secrets set WHATSAPP_PHONE_NUMBER_ID=...
   ```
4. Mientras no haya credenciales reales, dejar `WHATSAPP_PROVIDER=mock`
   (no envia nada real, solo loguea).

## 12. Correr el frontend (cliente)

```bash
npm run dev:web
```

Abrir http://localhost:5173.

## 13. Correr la aplicacion administrativa

```bash
npm run dev:admin
```

Abrir http://localhost:5174.

## 14. Ejecutar tests

```bash
npm run test
```

(Mientras no existan tests todavia — ver `docs/testing.md` — este comando
no falla, simplemente no encuentra nada que correr.)

## 15. Crear build de produccion

```bash
npm run build
```

Verifica que `apps/web/dist/` y `apps/admin/dist/` se generen sin errores.

## 16. Hacer deployment

Ver `docs/deployment.md` para el detalle completo de configuracion de
Cloudflare Pages (dos proyectos, uno por app) y de Supabase produccion.

## 17. Verificar que el sistema funciona

Checklist minimo post-recuperacion:

- [ ] `npm install` termina sin errores.
- [ ] `npm run typecheck` y `npm run lint` pasan sin errores.
- [ ] `npm run build` genera `apps/web/dist` y `apps/admin/dist`.
- [ ] `apps/web` carga en `localhost:5173` sin errores en consola.
- [ ] `apps/admin` carga en `localhost:5174` sin errores en consola.
- [ ] El proyecto de Supabase responde (probar login si Auth ya esta
      implementado, o al menos que `VITE_SUPABASE_URL` responda).
- [ ] Las migraciones aplicadas coinciden con `supabase/migrations/`
      (`supabase migration list`).
- [ ] Si Stripe esta implementado: un pago de prueba en modo test dispara
      el webhook y otorga creditos una sola vez (no duplicados).

Version resumida de esta guia en `docs/RECOVERY_CHECKLIST.md`.
