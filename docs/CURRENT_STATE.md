# Current State

> Actualizar este archivo despues de cada cambio importante. Es la memoria
> del proyecto entre sesiones de trabajo (humanas o de IA).

Ultima actualizacion: 2026-08-27 (`npm install`, `build`, `lint` y
`typecheck` verificados de punta a punta por primera vez; ambas apps
corren localmente con `npm run dev:web` / `npm run dev:admin`).

## Completed

- Repositorio Git conectado a GitHub (`Riqiperes/mba-studio`).
- Estructura de monorepo con npm workspaces: `apps/web`, `apps/admin`,
  `packages/shared`.
- `apps/web` y `apps/admin`: scaffolding Vite + React 19 + TypeScript
  estricto + Tailwind CSS v4, arquitectura Feature First con carpetas de
  feature documentadas (README por carpeta), pantalla de bienvenida
  temporal en cada app (sin logica de negocio).
- `packages/shared`: paquete de workspace con un par de tipos base
  (`UserRole`, `BusinessConfig`) como ejemplo del patron; todavia no
  importado desde las apps.
- `supabase/migrations/` y `supabase/functions/`: estructura de carpetas y
  documentacion de convenciones, sin SQL ni codigo de Edge Functions
  todavia.
- Documentacion: `CLAUDE.md`, `README.md`, y los 13 documentos de `docs/`
  (architecture, database, business-rules, authentication, payments,
  notifications, whatsapp, deployment, development, white-label, security,
  testing, roadmap) mas este archivo, `PROJECT_RECOVERY.md` y
  `RECOVERY_CHECKLIST.md`.
- `.env.example` (raiz y por app), `.gitignore`, `tsconfig.base.json` con
  TypeScript strict mode.

## In Progress

- Nada activamente en progreso. Proximo paso: ver "Next Task" abajo.

## Pending

Ver `docs/roadmap.md` para el orden completo. En resumen, todo lo que es
funcionalidad de negocio: Supabase (proyecto real, Auth, Google OAuth),
Database + RLS, Studio (paquetes, clases, bookings, creditos, waitlist),
Stripe, Academia, Notificaciones, WhatsApp, White-label activo, Testing,
Deployment.

## Known Issues

- `npm install`, `npm run build`, `npm run lint` y `npm run typecheck` ya
  se ejecutaron y pasan sin errores en ambas apps (Node v22.11.0, dentro
  del rango `>=20.19.0` del `engines`). Al `apps/web/package.json` y
  `apps/admin/package.json` les faltaba `@types/node` (lo necesita
  `tsconfig.node.json` para tipar `vite.config.ts`); se agrego como
  devDependency en ambos. `npm run dev:web` (puerto 5173) y
  `npm run dev:admin` (puerto 5174) sirven la pantalla de bienvenida
  correctamente, verificado en navegador.
- No hay tests todavia (esperado en esta fase, ver `docs/testing.md`).

## Recent Decisions

- npm workspaces en vez de pnpm/turborepo (simplicidad, sin herramientas
  extra).
- Tailwind CSS v4 via `@tailwindcss/vite` (sin `tailwind.config.js`
  obligatorio).
- React Router v6 (planeado, todavia no instalado como dependencia activa
  de ruteo real — esta en `package.json` de ambas apps lista para usarse
  en la etapa "Base UI" del roadmap).
- Dos apps Cloudflare Pages separadas (`apps/web`, `apps/admin`) en vez de
  una sola app con rutas admin protegidas, por separacion de superficie de
  riesgo (ver `docs/architecture.md`).
- Carpetas de feature vacias se documentan con un `README.md` en vez de
  `.gitkeep`, para que abrir la carpeta ya explique su proposito.
- Un solo proyecto de Supabase compartido (dev/staging) para todo el
  equipo por ahora; segundo proyecto de Supabase de produccion se crea
  recien antes de operar con clientes/pagos reales (ver
  `docs/deployment.md`).

## Funcionalidades implementadas

Ninguna funcionalidad de negocio todavia. Solo scaffolding de arquitectura.

## Integraciones configuradas

- **Supabase**: existe un proyecto (`MBA-STUDIO`, ref `eazyblybekyygimqpjjw`,
  region `us-east-1`) sin tablas ni migraciones todavia. Se usa como backend
  compartido de desarrollo/staging para todo el equipo (local y previews de
  Cloudflare Pages) — ver `docs/deployment.md`. `apps/web/.env` y
  `apps/admin/.env` ya apuntan a este proyecto para desarrollo local.
- **Cloudflare Pages**: todavia no configurado. Plan (dos proyectos, Root
  directory = raiz del repo, preview deployments automaticos por commit)
  documentado en `docs/deployment.md`.
- Stripe, Google OAuth y WhatsApp: documentados en `docs/` pero sin
  credenciales reales todavia.

## Variables de entorno necesarias

Ver `.env.example` en la raiz (lista completa y comentada).

## Migraciones existentes

Ninguna. `supabase/migrations/` esta vacio (ver su `README.md` para la
convencion que van a seguir las primeras migraciones).

## Deployment actual

Ningun deploy de frontend todavia (Cloudflare Pages pendiente de
configurar, ver "Next Task"). El proyecto de Supabase existe pero solo como
backend de base de datos/auth, sin nada desplegado en el (sin migraciones,
sin Edge Functions).

## Next Task

1. Configurar los dos proyectos de Cloudflare Pages (`apps/web`,
   `apps/admin`) siguiendo `docs/deployment.md`, apuntando por ahora al
   Supabase de desarrollo/staging existente.
2. Empezar la etapa "Database" del roadmap: migracion `001_business.sql` y
   `002_profiles.sql`, con sus policies de RLS, sobre el proyecto de
   Supabase existente.
