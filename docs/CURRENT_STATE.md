# Current State

> Actualizar este archivo despues de cada cambio importante. Es la memoria
> del proyecto entre sesiones de trabajo (humanas o de IA).

Ultima actualizacion: 2026-08-28 (Google OAuth login implementado en
`apps/web` — rama `feat/auth-google-oauth-web` —, con el cliente de
Supabase ahora tipado con `Database`; mas migraciones 001-008 aplicadas al
Supabase de desarrollo: business, profiles + rol, instructors,
studio_classes, packages, todas con RLS; mas dos fixes de seguridad sobre
`profiles` —privilege-escalation en `007` y fail-open con `NULL` en `008`—;
estructura de ramas Git formalizada — `main` protegida + `develop`).

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
- Estructura de ramas Git: `main` (produccion, protegida) y `develop`
  (integracion), documentada en `docs/git-workflow.md`. Falta configurar
  la proteccion real de `main` en GitHub (Settings > Branches).
- Migraciones `001` a `008` aplicadas al proyecto de Supabase de
  desarrollo/staging: `business`, `profiles` (+ enum `user_role`, trigger
  de creacion automatica de profile, funciones `current_user_role()` /
  `current_user_business_id()`), `instructors`, `studio_classes`,
  `packages`, mas el endurecimiento de privilegios de `006` y los dos
  fixes de seguridad de `007`/`008` sobre `profiles`. Todas con RLS
  habilitado. Ver "Migraciones existentes" abajo.
- PR #1 (`feat/database-schema-rls`, migraciones 001-008) y PR #2
  (`feat/auth-google-oauth-web`) mergeados a `develop` (PR #2 se
  retargeteo de `feat/database-schema-rls` a `develop` una vez el #1
  entro). Ambas ramas borradas (local y remoto) despues del merge.
- Google OAuth ("Continuar con Google")
  funcionando de punta a punta en `apps/web`, siguiendo el spec de
  `docs/superpowers/specs/2026-08-28-google-oauth-web-design.md`. Incluye:
  `lib/supabaseClient.ts` (cliente unico, ahora tipado con
  `createClient<Database>` usando los tipos generados en
  `lib/database.types.ts`); `features/auth/services/authService.ts`
  (`signInWithGoogle`, `signOut`, `getProfile`, `subscribeToAuthChanges` —
  unico punto que llama a `supabase.auth.*`); `features/auth/hooks/AuthProvider.tsx`
  + `useAuth()` (Context de sesion, carga automatica del `profile` al
  autenticarse); `features/auth/components/GoogleSignInButton.tsx` y
  `SignOutButton.tsx`; `routes/RequireAuth.tsx` (guarda minima por sesion,
  sin rol todavia); `pages/LoginPage.tsx` y `pages/HomePage.tsx`; y
  `App.tsx` montando `BrowserRouter` + `AuthProvider` + rutas `/login` y
  `/` (protegida). Falta el prerequisito manual de configurar el proveedor
  Google en el dashboard de Supabase para probar el flujo con una cuenta
  real (ver "Next Task").

## In Progress

- Nada activamente en progreso. Todo mergeado a `develop`. Proximo paso:
  ver "Next Task" abajo.

## Pending

Ver `docs/roadmap.md` para el orden completo. En resumen: Auth (email/password
+ Google OAuth), Base UI, Studio (paquetes, clases, bookings, creditos,
waitlist), Stripe, Academia, Notificaciones, WhatsApp, White-label activo,
Testing, Deployment (Cloudflare Pages).

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

- Login con Google (Google OAuth via Supabase Auth) en `apps/web`, con
  sesion persistida, carga automatica del `profile` y logout — ver
  "Completed" arriba. Falta configurar el provider en Supabase para
  probarlo con una cuenta real.

Ninguna funcionalidad de negocio (Studio/Academia) todavia. El resto sigue
siendo scaffolding de arquitectura.

## Integraciones configuradas

- **Supabase**: proyecto (`MBA-STUDIO`, ref `eazyblybekyygimqpjjw`, region
  `us-east-1`) con 5 tablas y RLS (ver "Migraciones existentes"). Se usa
  como backend compartido de desarrollo/staging para todo el equipo (local
  y previews de Cloudflare Pages) — ver `docs/deployment.md`. `apps/web/.env`
  y `apps/admin/.env` ya apuntan a este proyecto para desarrollo local.
  Se sembro una fila en `business` (`name = 'MBA MID'`) para que el trigger
  de registro de usuarios tenga a que negocio asignar el `profile` nuevo.
- **Cloudflare Pages**: todavia no configurado. Plan (dos proyectos, Root
  directory = raiz del repo, preview deployments automaticos por commit)
  documentado en `docs/deployment.md`.
- Stripe, Google OAuth y WhatsApp: documentados en `docs/` pero sin
  credenciales reales todavia.

## Variables de entorno necesarias

Ver `.env.example` en la raiz (lista completa y comentada).

## Migraciones existentes

Aplicadas al proyecto de Supabase de desarrollo (`eazyblybekyygimqpjjw`) y
versionadas en `supabase/migrations/`:

- `001_business.sql` — tabla `business` (columnas = `BusinessConfig` de
  `packages/shared`), RLS con lectura publica, fila sembrada `MBA MID`.
- `002_profiles.sql` — enum `user_role`, tabla `profiles`, funciones
  `current_user_role()` / `current_user_business_id()` (`SECURITY DEFINER`,
  usadas por las policies de RLS para evitar recursion), trigger
  `on_auth_user_created` que crea el `profile` automaticamente al
  registrarse (rol `CUSTOMER` por defecto, `business_id` = el negocio
  existente), trigger que impide que un usuario se autoasigne `role` o
  `business_id` en un `UPDATE`, y las policies de escritura de `business`
  (solo `BUSINESS_ADMIN`/`SUPER_ADMIN`).
- `003_instructors.sql` — RLS: lectura publica, escritura solo staff/admin
  del `business_id`.
- `004_studio_classes.sql` — enum `studio_class_status`; mismo patron de RLS
  que `instructors`.
- `005_packages.sql` — RLS: lectura publica solo de `active = true`,
  escritura solo staff/admin.
- `006_harden_trigger_function_privileges.sql` — revoca `EXECUTE` de
  `anon`/`authenticated` sobre las dos funciones de trigger (no deben
  invocarse via RPC directo), en respuesta al advisor de seguridad de
  Supabase corrido despues de aplicar `002`.
- `007_fix_profiles_privilege_escalation.sql` — corrige un bug real de
  privilege-escalation/tenant-isolation encontrado por el review de
  seguridad automatico sobre el commit de `002`: la version original de
  `prevent_profile_privilege_escalation()` solo bloqueaba cambios de
  `role`/`business_id` cuando el actor NO era `BUSINESS_ADMIN`/`SUPER_ADMIN`,
  lo que permitia que un `BUSINESS_ADMIN` se auto-ascendiera a
  `SUPER_ADMIN`, ascendiera a otro usuario de su negocio a `SUPER_ADMIN`, o
  moviera su propio profile a otro `business_id`. Ahora solo un
  `SUPER_ADMIN` existente puede otorgar `SUPER_ADMIN` o mover un profile
  entre negocios. Verificado con pruebas manuales (transacciones con
  `ROLLBACK`, sin dejar datos de prueba) simulando el ataque como
  `authenticated` via `request.jwt.claim.sub`.
- `008_fix_null_actor_role_fail_open.sql` — corrige un segundo bug
  encontrado por el review automatico sobre el commit de `007`: la
  funcion comparaba `v_actor_role` con `<>`/`NOT IN`, que devuelven
  `NULL` (no `TRUE`) cuando `current_user_role()` es `NULL` (actor sin
  fila propia en `profiles`); un `IF` de plpgsql trata `NULL` como
  `FALSE`, asi que esas ramas de bloqueo no se ejecutaban — fail-open en
  vez de fail-closed. No hay una via de explotacion en vivo con el RLS
  actual (las policies ya exigen que el actor tenga fila propia para
  llegar al trigger), pero se corrigio como defensa en profundidad,
  reemplazando las comparaciones por `IS DISTINCT FROM` (nunca devuelve
  `NULL`). Verificado forzando `current_user_role() = NULL` y bypasseando
  RLS a proposito (como `postgres`) para probar que el trigger se
  protege solo, sin depender de RLS.

Decision pendiente de validar con uso real: `studio_classes` e
`instructors` son de lectura publica (catalogo/marketing) por decision
explicita del usuario; `packages` solo expone los activos publicamente.

## Deployment actual

Ningun deploy de frontend todavia (Cloudflare Pages pendiente de
configurar, ver "Next Task"). El proyecto de Supabase existe pero solo como
backend de base de datos/auth, sin nada desplegado en el (sin migraciones,
sin Edge Functions).

## Next Task

PR #1 (migraciones) y PR #2 (Google OAuth en `apps/web`) ya mergeados a
`develop`. Google OAuth configurado en el dashboard de Supabase y
verificado end-to-end con una cuenta real (2026-08-28): login con
`riqiperes14@gmail.com`, `auth.users` creado, trigger
`on_auth_user_created` creo el `profile` correctamente (`role =
CUSTOMER`, `business_id` = negocio `MBA MID`, `full_name` desde los
metadatos de Google). El flujo de Google OAuth queda cerrado y probado
de punta a punta, no solo compilando.

1. Resto de la etapa "Authentication" del roadmap: email/password,
   recuperacion de contrasena, verificacion de email, login en
   `apps/admin`, y proteccion de rutas por rol (hoy `RequireAuth` solo
   protege por "hay sesion o no").
2. Configurar los dos proyectos de Cloudflare Pages (`apps/web`,
   `apps/admin`) siguiendo `docs/deployment.md` — mas adelante en el
   roadmap (paso 23), no urgente todavia.
