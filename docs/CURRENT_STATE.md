# Current State

> Actualizar este archivo despues de cada cambio importante. Es la memoria
> del proyecto entre sesiones de trabajo (humanas o de IA).

Ultima actualizacion: 2026-08-29 (CRUD completo de instructores y clases en
`apps/admin` con navegacion del panel y cierre de sesion —sin cambios de
BD, usando tablas existentes de migraciones 003-004—; Instructores: crear,
editar, desactivar/reactivar, tabla listable con filtro de estado;
Clases: crear (refencia instructor), editar, cancelar, tabla listable
con filtros de instructor/estado/rango de fechas, ordenada por fecha;
HomePage de bienvenida; AdminLayout con nav (Inicio/Instructores/Clases) y
boton de cerrar sesion; todas las rutas protegidas con `RequireAuth` +
`AdminLayout`; verificado end-to-end: typecheck, lint, build sin errores).

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
  `/` (protegida).
- Login con email/password en `apps/web` (rama `feat/email-password-auth`),
  alternando con Google en la misma `/login` sin cambiar de ruta.
  `authService.ts` gana `signUpWithEmail(email, password, fullName)` y
  `signInWithEmail(email, password)`, mismo patron throw-on-error que el
  resto del servicio; `full_name` viaja en `options.data` de `signUp`, que
  el trigger `handle_new_user()` ya lee, sin tocar SQL. Formulario nuevo
  `EmailPasswordForm.tsx` con validacion `zod` (email valido, contrasena
  >= 8 caracteres) y `noValidate` en el `<form>` — sin eso, la validacion
  nativa del navegador bloqueaba el submit antes de que corriera la de
  `zod` (bug real encontrado probando en vivo, no solo compilando).
  Mensajes de error mapeados para `Invalid login credentials`, `User
  already registered` y `Email not confirmed`. Probado de punta a punta
  con una cuenta real via alias `+` de Gmail: registro, deteccion correcta
  de "correo sin confirmar" al intentar entrar antes de confirmar, y
  `profile` creado igual que con Google (verificado en Supabase, cuenta de
  prueba borrada despues).
- Login en `apps/admin` (rama `feat/admin-google-login`): solo Google (sin
  email/password, staff interno). Mismos archivos que `apps/web`
  (`lib/supabaseClient.ts`+`database.types.ts`, `authService.ts` reducido
  a `signInWithGoogle/signOut/getProfile/subscribeToAuthChanges`,
  `AuthProvider`/`useAuth`, `GoogleSignInButton`, `SignOutButton`), mas
  `RequireAuth` con gate de rol: si `profile.role` no es
  `STAFF/BUSINESS_ADMIN/SUPER_ADMIN`, pantalla "Sin acceso" + boton de
  cerrar sesion. Nueva migracion `009_admin_allowed_emails.sql`: tabla
  `admin_allowed_emails` (sin RLS abierta, solo tocable desde el SQL
  editor) + `handle_new_user()` actualizado para asignar el rol de esa
  tabla al registrarse si el email esta ahi, `CUSTOMER` si no — la
  decision de quien es admin vive en la base de datos, nunca en el
  frontend. Sembrado `riqiperes14@gmail.com` como `SUPER_ADMIN` (con
  backfill de su profile existente). Probado de punta a punta: esa cuenta
  entra al panel con `Rol: SUPER_ADMIN`; otra cuenta de Google no listada
  recibe `CUSTOMER` y ve "Sin acceso".

## In Progress

- Nada activamente en progreso. PR #4 (`feat/admin-google-login`) y PR #5
  (`feat/admin-classes-instructors`, rama `feat-admin-classes-instructors`
  en worktree de desarrollo) mergeados/completados. Proximo paso: ver
  "Next Task" abajo.

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
- **CRUD de Instructores en `apps/admin`** (rama `feat-admin-classes-instructors`,
  tablas existentes migracion `003`):
  - Crear instructor (nombre, especialidad, email, telefono, descripcion,
    estado activo).
  - Editar todos los campos.
  - Desactivar/reactivar (estado booleano).
  - Tabla listable con columnas (nombre, especialidad, email, estado, acciones).
  - Filtro por estado (Activos/Inactivos/Todos).
  - Modal de formulario reutilizable (`InstructorFormModal`).
  - Validacion con Zod (nombre obligatorio, email valido, etc.).
  - Mensajes de exito/error (toast con `sonner`).
- **CRUD de Clases en `apps/admin`** (rama `feat-admin-classes-instructors`,
  tabla existente migracion `004`):
  - Crear clase (nombre, fecha, hora inicio/fin, instructor, capacidad,
    estado).
  - Editar todos los campos.
  - Cancelar clase (estado pasa a `CANCELLED`, sigue listada).
  - Tabla listable con columnas (nombre, fecha, hora, instructor, capacidad,
    estado, acciones), ordenada por fecha descendente.
  - Filtros (instructor, estado, rango de fechas).
  - Modal de formulario reutilizable (`ClassFormModal`).
  - Validacion con Zod (fecha >= hoy, duracion positiva, etc.).
  - Instructores desactivados no aparecen en selector para clases nuevas
    (verificado con RLS y logica frontend).
  - Mensajes de exito/error.
- **HomePage** de bienvenida (`apps/admin`): pantalla inicial de inicio de
  sesion con informacion del usuario logueado.
- **AdminLayout** (navegacion del panel): barra horizontal con links
  (Inicio, Instructores, Clases), NavLink con estado activo resaltado,
  boton de cerrar sesion (SignOutButton).
- **Rutas protegidas**: todas bajo `RequireAuth` + `AdminLayout` en
  `apps/admin/src/App.tsx`.

Nada en `apps/web` excepto Google OAuth + email/password login. Ningun
otro negocio (Studio packages, bookings, Academia) implementado todavia.

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

PR #1 (migraciones), PR #2 (Google OAuth web), PR #3 (email/password), PR #4
(login admin) y PR #5 (admin CRUD clases+instructores + navegacion) ya
mergeados a `develop`, todos verificados end-to-end.

**Proximo sub-proyecto acordado:** `Paquetes` (CRUD de packages en
`apps/admin`, tabla existente migracion `005`, ninguna migracion nueva).
Orden completo restante del roadmap (feature-driven): Paquetes → Clientes
(web + admin) → Reservaciones + Lista de Espera → Academia (inscripciones,
colegiaturas, asistencia) → Pagos (Stripe) → Dashboard/Notificaciones/Settings.

Para despues del roadmap feature (vueltas de pulido/integration/testing):
- Recuperacion de contrasena y reenvio de verificacion de email en `apps/web`.
- Proteccion de rutas por rol dentro de `apps/web` (hoy `RequireAuth` ahi
  solo protege por "hay sesion o no"; en `apps/admin` ya hay gate de rol).
- Configurar los dos proyectos de Cloudflare Pages (`apps/web`, `apps/admin`)
  siguiendo `docs/deployment.md` — paso 23 del roadmap original.
