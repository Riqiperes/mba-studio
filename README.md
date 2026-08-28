# mba-studio

Plataforma de membresias y reservaciones para **MBA MID**: un estudio de
Pilates (paquetes, creditos, reservaciones, lista de espera) y una academia
de ballet/danza (inscripciones, colegiaturas, asistencia). MVP para un solo
negocio, con la base preparada para convertirse mas adelante en un producto
white-label / SaaS para estudios similares.

## Arquitectura y stack

Monorepo (npm workspaces) con dos aplicaciones frontend y un backend
Supabase compartido:

```
Cliente (apps/web)  ---\
                          >---  Supabase (Auth + Postgres/RLS + Storage + Edge Functions)  ---  Stripe
Admin (apps/admin)  ---/
```

- **Frontend**: React + Vite + TypeScript (strict) + Tailwind CSS v4.
- **Backend**: Supabase (Postgres, Auth con Google OAuth, Storage, Row
  Level Security, Edge Functions).
- **Pagos**: Stripe Checkout + Stripe Webhooks.
- **Hosting**: Cloudflare Pages (frontend). Sin servidor propio, sin
  Docker en produccion.

Detalle completo de decisiones y convenciones en [`CLAUDE.md`](./CLAUDE.md)
y en [`docs/architecture.md`](./docs/architecture.md).

## Estructura del repositorio

```
mba-studio/
  apps/
    web/      # app de cliente (Studio + Academia)
    admin/    # panel administrativo
  packages/
    shared/   # tipos/constantes compartidos entre apps/web y apps/admin
  supabase/
    migrations/   # SQL, secuencial
    functions/    # Edge Functions (Deno)
  docs/       # documentacion por tema
```

Cada app usa arquitectura **Feature First**
(`src/features/<feature>/{components,hooks,services,types}`). Ver
`docs/architecture.md` para el detalle completo.

## Instalacion

Requisitos: Node.js `>= 20.19.0` (ver `.nvmrc`), npm.

```bash
git clone https://github.com/Riqiperes/mba-studio.git
cd mba-studio
npm install
```

## Variables de entorno

```bash
cp .env.example apps/web/.env
cp .env.example apps/admin/.env
```

Ver [`.env.example`](./.env.example) para la lista completa y comentada de
cada variable (Supabase, Stripe, WhatsApp, Email).

## Correr el frontend

```bash
npm run dev:web     # apps/web   -> http://localhost:5173
npm run dev:admin   # apps/admin -> http://localhost:5174
```

## Build, lint, typecheck, tests

```bash
npm run build        # build de apps/web y apps/admin
npm run lint
npm run typecheck
npm run test          # corre tests donde existan (todavia no hay ninguno)
```

## Configurar Supabase

1. Crear un proyecto en [supabase.com](https://supabase.com).
2. Copiar `Project URL` y `anon public key` a `VITE_SUPABASE_URL` /
   `VITE_SUPABASE_ANON_KEY`.
3. Aplicar migraciones (`supabase/migrations/`, vacio por ahora — ver
   `docs/database.md`) con el Supabase CLI o el MCP de Supabase.
4. Detalle completo en `docs/development.md` y `docs/PROJECT_RECOVERY.md`.

## Configurar Google OAuth

Se configura en el dashboard de Supabase (Authentication > Providers >
Google) con credenciales de Google Cloud Console. Pasos detallados en
[`docs/authentication.md`](./docs/authentication.md).

## Configurar Stripe

Checkout + Webhooks desde Edge Functions, nunca confiando en el frontend
para confirmar un pago. Pasos detallados en
[`docs/payments.md`](./docs/payments.md).

## Configurar WhatsApp

Proveedor desacoplado detras de una interfaz comun
(`mock` / `meta` / `twilio` / `ultramsg`), seleccionado por
`WHATSAPP_PROVIDER`. Detalle en [`docs/whatsapp.md`](./docs/whatsapp.md).

## Deploy

Cloudflare Pages para `apps/web` y `apps/admin` (un proyecto por app),
Supabase para backend. Checklist completo en
[`docs/deployment.md`](./docs/deployment.md).

## Recuperar el proyecto desde cero

Si se pierde la maquina, el `node_modules`, o hay que clonar en un equipo
nuevo: [`docs/PROJECT_RECOVERY.md`](./docs/PROJECT_RECOVERY.md) (guia
completa paso a paso) y [`docs/RECOVERY_CHECKLIST.md`](./docs/RECOVERY_CHECKLIST.md)
(checklist rapido).

## Documentacion

| Documento | Contenido |
|---|---|
| [`CLAUDE.md`](./CLAUDE.md) | Reglas permanentes del proyecto |
| [`docs/architecture.md`](./docs/architecture.md) | Arquitectura frontend/backend |
| [`docs/database.md`](./docs/database.md) | Esquema y convenciones de base de datos |
| [`docs/business-rules.md`](./docs/business-rules.md) | Reglas de negocio (creditos, reservaciones, waitlist, colegiaturas) |
| [`docs/authentication.md`](./docs/authentication.md) | Auth, roles, Google OAuth |
| [`docs/payments.md`](./docs/payments.md) | Stripe, idempotencia de webhooks |
| [`docs/notifications.md`](./docs/notifications.md) | Notificaciones (email/WhatsApp/push) |
| [`docs/whatsapp.md`](./docs/whatsapp.md) | Abstraccion de proveedor de WhatsApp |
| [`docs/deployment.md`](./docs/deployment.md) | Cloudflare Pages + Supabase |
| [`docs/development.md`](./docs/development.md) | Flujo de desarrollo local |
| [`docs/white-label.md`](./docs/white-label.md) | Preparacion multi-tenant / white-label |
| [`docs/security.md`](./docs/security.md) | RLS, secretos, manejo de errores |
| [`docs/testing.md`](./docs/testing.md) | Estrategia de tests |
| [`docs/roadmap.md`](./docs/roadmap.md) | Orden de construccion del MVP |
| [`docs/CURRENT_STATE.md`](./docs/CURRENT_STATE.md) | Estado actual del proyecto |
| [`docs/PROJECT_RECOVERY.md`](./docs/PROJECT_RECOVERY.md) | Reconstruccion completa desde cero |
| [`docs/RECOVERY_CHECKLIST.md`](./docs/RECOVERY_CHECKLIST.md) | Checklist rapido de recuperacion |

## Current project status

**Fase: scaffolding inicial completo. Sin funcionalidades de negocio
implementadas todavia.**

Completado:

- Estructura de monorepo (npm workspaces): `apps/web`, `apps/admin`,
  `packages/shared`.
- `apps/web` y `apps/admin`: Vite + React 19 + TypeScript estricto +
  Tailwind CSS v4, con arquitectura Feature First y una pantalla de
  bienvenida temporal (build funcional, sin logica de negocio).
- `CLAUDE.md`, documentacion completa en `docs/`, `.env.example`,
  `.gitignore`, `tsconfig.base.json` con strict mode.
- Estructura de `supabase/migrations/` y `supabase/functions/` (carpetas y
  README, sin SQL ni Edge Functions todavia).

Pendiente (ver `docs/roadmap.md` para el orden completo):

- Proyecto de Supabase creado y conectado.
- Migraciones de base de datos y RLS.
- Autenticacion (email/password + Google OAuth).
- Paquetes, clases, reservaciones, creditos, lista de espera.
- Stripe (Checkout + Webhooks).
- Academia (inscripciones, colegiaturas, asistencia).
- Notificaciones y WhatsApp.
- Deploy a Cloudflare Pages.

Problemas conocidos:

- Este scaffolding se genero en un entorno sandbox sin acceso a internet,
  por lo que `npm install` **no se ha ejecutado ni verificado todavia**.
  Es el primer paso a correr localmente. Ver
  `docs/CURRENT_STATE.md` para el detalle.
