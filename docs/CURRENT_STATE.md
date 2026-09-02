# Current State

> Actualizar este archivo despues de cada cambio importante. Es la memoria
> del proyecto entre sesiones de trabajo (humanas o de IA).

Ultima actualizacion: 2026-09-02 (Acceso público web + 8 specs nuevas + migración 016 consolidada):
- **Web pública**: Rutas `/`, `/packages`, `/packages/:id`, `/classes`, `/classes/:id` accesibles sin login.
  Login/registro solo para `/my-bookings`, `/profile`. `redirectTo` en todo el flujo auth.
  Navegación inferior mobile-first con redirección a login si no hay sesión.
- **8 specs nuevas documentadas** en `docs/superpowers/specs/`:
  1. Cancelación 12h + reset mensual créditos (RPC `cancel_booking` con ventana 12h, `reset_monthly_credits` día 1).
  2. Waitlist solo recordatorio manual (sin cola FIFO, tabla `waitlist_notifications`, botón "Enviar recordatorio" en admin).
  3. Colegiaturas día 10 fijo (corte global, `day_of_month=10`, overdue = `period_end < hoy`).
  4. Descuentos referido (`discount_percent` 0-100 en `profiles`, solo academia/ballet, auditoría `discount_applied`).
  4. Campos médicos alumnos (`medical_conditions`, `age`, `notes` en `dependents`, alerta ⚠️ + modal en listas).
  5. Rol `INSTRUCTOR_ADMIN` (ver solo sus clases/alumnos, navegación condicional, `/instructor/my-classes`, filtro por instructor).
  6. Grupos academia edad + cupo (`age_min`, `age_max`, `max_capacity` default 15/max 15, validación en inscripción).
  7. Acceso público web (eliminado login gate en catálogo, login solo para transacciones).
  8. Migración 016 consolidada (`016_comprehensive_features.sql`): RLS, campos, roles, RPCs, policies instructor_admin.
- **Migración 016** (`016_comprehensive_features.sql`): RLS customer-scoped, campos nuevos (`discount_percent`, `medical_conditions`, `age`, `notes`, `age_min`, `age_max`, `max_capacity`, `instructor_id`), rol `INSTRUCTOR_ADMIN`, tabla `waitlist_notifications`, RPCs actualizados (`cancel_booking` ventana 12h, `reset_monthly_credits`, eliminación `promote_from_waitlist`), policies RLS `INSTRUCTOR_ADMIN`.
- **Documentación actualizada**: `roadmap.md` (nueva numeración 19-26), `business-rules.md` (reglas completas), `preguntas-para-negocio.md` (decisiones + preguntas pendientes), `roadmap.md`, `CLAUDE.md` (nota acceso público), `README.md` (nota acceso público).
- **Plan maestro**: `docs/superpowers/plans/2026-09-02-comprehensive-implementation.md` (11 fases ordenadas).
- **Docs actualizados**: `roadmap.md`, `business-rules.md`, `preguntas-para-negocio.md`, `CLAUDE.md`, `README.md`, `CURRENT_STATE.md`, `HANDOFF.md`, specs, plan maestro, migración 016.
- Verificado typecheck/lint/build en `apps/web` y `apps/admin`. Sesion previa: Academia
— Clientes sin cuenta / tutores de mostrador en `apps_admin` —migracion nueva 013 para hacer `guardian_id` nullable y agregar
`guardian_name` y `guardian_phone` en `dependents` con check constraint de
integridad—: soporte para registrar e inscribir alumnos de tutores que pagan
en mostrador sin cuenta en Supabase Auth; modal de inscripcion en Academia con
selector de modo "Cliente con cuenta" vs "Tutor de mostrador" para crear e
inscribir en un solo paso; vista global `/students` permite crear y editar
alumnos con tutor de mostrador y muestra nombre y telefono de contacto;
resolucion transparente del tutor en el detalle de grupos y tablas de alumnos;
verificado con typecheck, lint y build en ambas apps). Sesion previa: Academia
— Grupos e Inscripciones en `apps_admin` —migracion nueva 012 para tablas
`academy_groups`, `academy_group_schedules` y `academy_enrollments` con RLS
staff-scoped—: CRUD de grupos con instructor opcional y horarios semanales
repetibles; detalle de grupo con lista de alumnos inscritos; modal para inscribir
alumnos existentes o crear alumnos inline para clientes registrados; dar de baja
alumnos; prevencion de inscripciones duplicadas via unique index condicional;
navegacion y boton en HomePage hacia `/academy/groups` y `/academy/groups/:id`;
verificado con typecheck, lint y build en ambas apps). Sesion previa: Reservaciones + Lista de Espera + Creditos
en `apps_admin` —migracion nueva 011 para tablas `bookings`/`waitlist`/
`customer_credits_ledger` y 4 funciones RPC `security definer`
transaccionales (`book_class`, `cancel_booking`, `promote_from_waitlist`,
`grant_credits`)—: ledger de creditos por cliente con otorgamiento manual
desde el detalle de cliente; reservar/cancelar una clase a nombre de un
cliente desde `/classes/:id`; lista de espera con promocion manual (nunca
automatica); toda escritura de `bookings`/`customer_credits_ledger` pasa
por las 4 funciones RPC (RLS solo permite `select` en esas dos tablas) que
validan cupo/credito atomicamente Y, desde un fix posterior de seguridad,
rol (`STAFF`/`BUSINESS_ADMIN`/`SUPER_ADMIN`) y tenant (`business_id`)
internamente — ver "Known Issues" para el detalle del hallazgo de
seguridad y el bug de manejo de errores encontrados durante la
verificacion manual. Sesion previa: CRUD de Clientes y Alumnos en
`apps_admin` —migracion nueva 010 para la tabla `dependents`, resto sobre
`profiles` existente—: directorio de clientes de solo lectura/edicion
basica sobre `profiles` con rol `CUSTOMER`; CRUD de alumnos por cliente
(crear, editar, desactivar/reactivar) en el detalle de cada cliente; vista
global `/students` con columna "Tutor"; panel de inicio (`HomePage`)
rediseñado como grid de botones grandes (Instructores, Clases, Paquetes,
Clientes, Alumnos); AdminLayout gana los links "Clientes" y "Alumnos".
Naming: tabla/codigo en ingles `dependents`, toda la UI dice "Alumno(s)",
nunca "Dependiente". Sesion previa: CRUD de paquetes en `apps_admin` —sin
cambios de BD, tabla existente de migracion 005—: crear, editar,
desactivar/reactivar, tabla listable con columnas nombre/creditos/precio/
vigencia/estado; precio se captura en pesos enteros en el form y el
service lo convierte a `price_cents`; moneda fija en MXN, sin selector;
AdminLayout gana el link "Paquetes". Sesion previa: CRUD completo de
instructores y clases en `apps_admin` con navegacion del panel y cierre
de sesion —sin cambios de BD, usando tablas existentes de migraciones
003-004—; Instructores: crear, editar, desactivar/reactivar, tabla
listable sin filtro de estado; Clases: crear (referencia instructor),
editar, cancelar, tabla listable con filtros de instructor/estado/rango
de fechas, ordenada por fecha; HomePage de bienvenida; AdminLayout con
nav y boton de cerrar sesion; todas las rutas protegidas con
`RequireAuth` + `AdminLayout`; verificado end-to-end: typecheck, lint,
build sin errores).

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

- PR #4 (`feat/admin-google-login`), PR #5 (`feat/admin-classes-instructors`),
  PR #6 (`fix/pr5-minor-polish`), el PR de `feat/admin-packages` (CRUD de
  paquetes), PR #8 (`feat/admin-customers`, Clientes + Alumnos), PR #9
  (`feat/admin-bookings`, Reservaciones + Lista de Espera + Creditos), PR #10
  (`feat/admin-academy-groups`, Academia Grupos + Inscripciones) y PR #11
  (`feat/admin-academy-unregistered-guardians`, Academia Clientes sin cuenta)
  ya mergeados a `develop`. Sub-proyecto `Academia — Colegiaturas`
  (rama `feat/admin-academy-tuition`) esta completo y verificado por codigo
  (typecheck/lint/build sin errores en ambas apps) y por revision de
  diseno/calidad, listo para PR y merge a `develop`.
  Proximo paso: ver "Next Task" abajo.

## Pending

Ver `docs/roadmap.md` para el orden completo. En resumen: Auth (email/password
+ Google OAuth), Base UI, Studio (paquetes, clases, bookings, creditos,
waitlist), Stripe, Academia (Colegiaturas ✓, Asistencia), Notificaciones,
WhatsApp, White-label activo, Testing, Deployment (Cloudflare Pages).

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
- **[Resuelto]** Las 4 funciones RPC de reservaciones/creditos
  (`book_class`, `cancel_booking`, `promote_from_waitlist`,
  `grant_credits`, migracion `011_bookings.sql`) se aprobaron en su primer
  review sin ningun chequeo interno de rol ni `business_id` — solo
  dependian del `grant` a `authenticated`, asi que cualquier usuario
  autenticado con rol `CUSTOMER` podia otorgarse creditos a si mismo o
  reservar/cancelar a nombre de cualquier cliente de cualquier negocio.
  Encontrado por un review de seguridad automatico en segundo plano
  (no por ninguno de los 4 reviews de tarea del plan). Corregido antes de
  seguir con el resto del plan: las 4 funciones ahora validan
  `current_user_role() in ('STAFF','BUSINESS_ADMIN','SUPER_ADMIN')` y
  tenant (`business_id = current_user_business_id()` salvo
  `SUPER_ADMIN`) al inicio. Re-aplicado a Supabase dev via
  `011_bookings_authz_fix`; advisors sin hallazgos nuevos tras el cambio.
- **[Resuelto]** `err instanceof Error ? err.message : "generico"` (patron
  usado en toda la feature de reservaciones y tambien en `mapSaveError` de
  Clases/Instructores/Alumnos/Paquetes) nunca detecta un error real de
  `supabase.rpc()`/`.from()`: `PostgrestError` es un objeto plano en
  runtime en la version instalada de `@supabase/supabase-js`, pese a que
  su codigo fuente declara `extends Error`. Esto ocultaba todo mensaje de
  negocio de las RPCs ("cupo lleno", "ya tiene reservacion activa", "sin
  creditos disponibles", "no autorizado") detras de un mensaje generico
  inutil. Encontrado durante la verificacion manual end-to-end de la Task
  5 del plan de reservaciones (ninguno de los 4 reviews de tarea lo
  detecto, todos revisaron el diff sin correr la app en vivo). Corregido
  en la feature de reservaciones/creditos con
  `apps/admin/src/utils/getErrorMessage.ts` (duck-typing sobre `message`).
  Los 4 modales preexistentes con `mapSaveError` comparten la misma raiz
  del bug pero quedan sin corregir por ahora — ver "Deuda tecnica
  conocida" en `docs/roadmap.md`.

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
  tabla existente migracion `003`):
  - Crear instructor (`fullName` obligatorio, `bio` opcional, `photoUrl`
    opcional).
  - Editar todos los campos.
  - Desactivar/reactivar (estado booleano `active`).
  - Tabla listable con columnas (nombre, estado, acciones). Sin filtro de
    estado (no existe filtro en `InstructorsPage`).
  - Modal de formulario reutilizable (`InstructorFormModal`).
  - Validacion con Zod (`fullName` obligatorio, `photoUrl` debe ser URL
    valida si se ingresa; no hay campo de email en este formulario).
  - Mensajes de error inline (texto rojo bajo el formulario o la tabla,
    ver `mapSaveError` en `InstructorFormModal.tsx`); sin toast — `sonner`
    no es dependencia de `apps/admin` (ver `apps/admin/package.json`).
- **CRUD de Clases en `apps/admin`** (rama `feat-admin-classes-instructors`,
  tabla existente migracion `004`):
  - Crear clase (titulo, instructor, fecha/hora de inicio, fecha/hora de
    fin, cupo maximo).
  - Editar todos los campos.
  - Cancelar clase (estado pasa a `CANCELLED`, sigue listada).
  - Tabla listable con columnas (titulo, instructor, horario, cupo,
    estado, acciones), ordenada por `starts_at` ascendente (mas proxima
    primero — ver `listClasses` en `classesService.ts`).
  - Filtros (instructor, estado, rango de fechas desde/hasta — ver
    `ClassFiltersBar.tsx`).
  - Modal de formulario reutilizable (`ClassFormModal`).
  - Validacion con Zod (titulo y instructor obligatorios, fecha/hora de
    inicio y fin obligatorias, fin posterior a inicio, cupo entero
    positivo; sin validacion de fecha minima/pasada).
  - Instructores desactivados no aparecen en selector para clases nuevas
    (verificado con RLS y logica frontend).
  - Mensajes de error inline (mismo patron que Instructores, sin toast).
- **CRUD de Paquetes en `apps/admin`** (rama `feat/admin-packages`, tabla
  existente migracion `005`):
  - Crear paquete (nombre, descripcion opcional, creditos, precio,
    vigencia en dias opcional).
  - Editar todos los campos.
  - Desactivar/reactivar (estado booleano `active`).
  - Tabla listable con columnas (nombre, creditos, precio, vigencia,
    estado, acciones).
  - Precio se captura en pesos enteros en el formulario (input
    `type="number"`, sin decimales); `packagesService.ts` lo convierte a
    `price_cents` (x100) al guardar en la BD y de vuelta a pesos al leer
    para mostrar en la tabla (formateado con `Intl.NumberFormat`). Los
    centavos quedan disponibles en la columna de la BD para cuando
    Stripe cobre comision, aunque hoy no se editen directamente.
  - Moneda fija en `MXN`, sin selector en el formulario (un solo negocio,
    sin Stripe todavia — YAGNI).
  - Vigencia en dias es opcional: campo vacio se guarda como `NULL`
    ("sin vencimiento" en la tabla).
  - Modal de formulario reutilizable (`PackageFormModal`), con los fixes
    ya aprendidos en Instructores/Clases desde el arranque: usa
    `result.data` de Zod (no estado crudo), cierre con tecla Escape,
    `noValidate` en el `<form>`.
  - `confirm()` del navegador antes de desactivar un paquete (no antes de
    reactivar).
  - Validacion con Zod (nombre obligatorio, creditos entero positivo,
    precio entero no negativo, vigencia entero positivo o vacio).
  - Mensajes de error inline (mismo patron que Instructores/Clases, sin
    toast).
- **CRUD de Clientes y Alumnos en `apps/admin`** (rama `feat/admin-customers`,
  tabla nueva `dependents` en migracion `010`, resto sobre `profiles`
  existente):
  - Directorio de clientes (`/customers`, `CustomersPage`): lista
    perfiles con `role = 'CUSTOMER'` (nombre, telefono), sin crear
    clientes desde el admin (se registran ellos mismos en `apps/web`).
  - Detalle de cliente (`/customers/:id`, `CustomerDetailPage`): editar
    nombre/telefono del cliente (`customersService.updateCustomer`,
    `UPDATE` sobre `profiles`), mas la tabla de alumnos de ese cliente.
  - CRUD de alumnos (tabla `dependents`, FK `guardian_id` a `profiles`,
    `business_id` para el camino a multi-tenant): crear (nombre
    obligatorio, fecha de nacimiento opcional y no futura), editar,
    desactivar/reactivar (booleano `active`).
  - Vista global `/students` (`StudentsPage`): todos los alumnos de todos
    los clientes, con columna "Tutor" (nombre del cliente,
    `showGuardianColumn` en `DependentsTable`).
  - Modal de formulario reutilizable (`DependentFormModal`), mismo patron
    aprendido en Paquetes: `result.data` de Zod, cierre con tecla Escape,
    `noValidate` en el `<form>`, `mapSaveError` para distinguir RLS de
    constraint.
  - `confirm()` del navegador antes de desactivar un alumno (no antes de
    reactivar), mismo patron que Paquetes.
  - RLS de `dependents`: solo `STAFF`/`BUSINESS_ADMIN` de su `business_id`
    o `SUPER_ADMIN` pueden leer/escribir; sin policy de autoservicio del
    cliente todavia (se agrega cuando exista pantalla real en `apps/web`).
  - Naming: tabla y codigo en ingles (`dependents`, `guardian_id`), pero
    toda la UI visible dice "Alumno"/"Alumnos", nunca "Dependiente".
- **Reservaciones + Lista de Espera + Creditos en `apps/admin`** (rama
  `feat/admin-bookings`, tablas nuevas `bookings`/`waitlist`/
  `customer_credits_ledger` en migracion `011`):
  - Ledger de creditos por cliente (`features/credits`): balance
    (`getCreditBalance`, suma de `delta` en `customer_credits_ledger`) y
    otorgamiento manual (`GrantCreditsModal`, cantidad entera positiva +
    nota opcional) visible en `/customers/:id`.
  - Reservar/cancelar una clase a nombre de un cliente
    (`/classes/:id`, `ClassBookingsPage`, link "Ver reservaciones" desde
    `ClassesTable`): tabla de reservados con boton "Cancelar", boton
    "Reservar cliente" (deshabilitado cuando la clase esta llena).
  - Lista de espera (`waitlist`): boton "Agregar a lista de espera"
    aparece cuando la clase esta llena; boton "Promover" (siempre manual,
    nunca automatico) y "Quitar".
  - Toda escritura de `bookings`/`customer_credits_ledger` pasa por 4
    funciones RPC `security definer` transaccionales (`book_class`,
    `cancel_booking`, `promote_from_waitlist`, `grant_credits`) que
    validan cupo/credito atomicamente con `for update`, mas rol y tenant
    internamente (ver "Known Issues"); `waitlist` acepta INSERT/DELETE
    directos con RLS normal (staff-scoped).
  - Mensajes de error de las RPCs se muestran verbatim (español, listos
    para UI) via `apps/admin/src/utils/getErrorMessage.ts`, sin
    `mapSaveError`.
  - Verificado end-to-end en navegador con sesion real: otorgar creditos,
    reservar, reservacion duplicada rechazada, cupo lleno deshabilita
    reservar y habilita lista de espera, agregar/quitar de lista de
    espera, cancelar reservacion devuelve el credito y libera cupo,
    Escape cierra los modales. **No verificados en vivo** (dataset de
    desarrollo con un solo cliente, insuficiente para ambos casos):
    promover con exito desde lista de espera (solo se probo el
    "Promover" deshabilitado por `isFull`, no una promocion real) y
    reservar con balance de creditos en 0 (el mensaje "sin creditos
    disponibles" no se disparo en vivo). Ambos reusan el mismo mecanismo
    de RPC + `getErrorMessage` ya probado por el caso de reservacion
    duplicada, asi que el riesgo residual es bajo, pero falta confirmarlo
    con un segundo cliente de prueba antes de darlos por hecho.
- **Academia — Grupos e inscripciones en `apps/admin`** (rama `feat/admin-academy-groups`,
  tablas nuevas `academy_groups`, `academy_group_schedules`, `academy_enrollments` en
  migracion `012_academy_groups.sql`):
  - CRUD de grupos de Academia (`/academy/groups`, `AcademyGroupsPage`): nombre
    obligatorio, instructor asignable opcionalmente (select sobre `useInstructors`),
    horarios semanales repetibles (día de la semana 0-6 + hora inicio/fin con validación
    `end_time > start_time`).
  - Resumen de horarios formateado en tabla ("Mar 17:00-18:00, Jue 17:00-18:00") y conteo
    en vivo de inscritos activos.
  - Formulario modal (`AcademyGroupFormModal`) con Zod, `noValidate`, soporte para
    agregar/quitar filas de horarios y cierre con Escape.
  - Detalle del grupo (`/academy/groups/:id`, `AcademyGroupDetailPage`): encabezado con
    nombre, instructor y horario formateado; tabla de alumnos inscritos con nombre del
    alumno, tutor (`profiles.full_name`) y fecha de inscripción; botón para dar de baja
    (cambia `status` a `'BAJA'`) con confirmación de navegador.
  - Inscripción de alumnos (`EnrollStudentModal`): selector de cliente existente (`useCustomers`),
    selector de alumnos de ese tutor (`useDependentsByGuardian`) con opción de crear alumno nuevo
    inline (nombre + fecha de nacimiento opcional) sin salir del modal, fecha de inscripción
    (date input, default hoy).
  - Control de duplicados: `unique index` condicional en BD (`academy_enrollments_active_unique`
    donde `status = 'ACTIVA'`), permitiendo reinscribir a alumnos previamente dados de baja y
    permitiendo que un alumno esté inscrito en múltiples grupos distintos simultáneamente.
  - Manejo de errores: usa `apps/admin/src/utils/getErrorMessage.ts` para capturar errores de RLS
    y constraints en runtime.
  - Sin funciones RPC: escritura directa vía RLS staff-scoped (`STAFF`, `BUSINESS_ADMIN`,
    `SUPER_ADMIN`), sin cupo máximo por grupo en este sub-proyecto.
  - Navegación: link "Academia" en `AdminLayout` y botón "Academia" en el grid de `HomePage`.
- **Academia — Clientes sin cuenta ("tutores de mostrador") en `apps/admin`** (rama
  `feat/admin-academy-unregistered-guardians`, migracion `013_dependents_unregistered_guardians.sql`):
  - Flexibilización de esquema: `dependents.guardian_id` pasa a ser nullable, se agregan
    `guardian_name` y `guardian_phone`, y se impone check constraint `dependents_guardian_check`
    para asegurar que todo alumno tenga tutor con cuenta o nombre de tutor registrado.
  - Modal de inscripción (`EnrollStudentModal`): pestañas para alternar entre "Cliente con cuenta"
    (flujo existente) y "Tutor de mostrador (sin cuenta)" (captura nombre/teléfono del tutor,
    nombre/fecha de nacimiento del alumno y fecha de inscripción; crea e inscribe en un solo paso).
  - Directorio global de alumnos (`/students`, `StudentsPage`): botón "Nuevo alumno" para dar de
    alta alumnos con tutor de mostrador directamente, tabla con formato `Tutor (Teléfono)`, y
    edición de datos de tutor de mostrador en `DependentFormModal`.
  - Detalle de grupo (`AcademyGroupDetailPage`): resolución automática y transparente del nombre
    del tutor para inscripciones de clientes con cuenta o de mostrador.
  - Manejo de errores actualizado en formularios de dependientes con `getErrorMessage.ts`.
- **Academia — Colegiaturas en `apps/admin`** (rama `feat/admin-academy-tuition`, migracion `014_academy_tuition.sql`):
  - Tablas nuevas `academy_tuition_periods` (configuración por grupo: día fijo del mes o aniversario,
    monto en centavos) y `academy_payments` (registro por inscripción y periodo: estado `PAGADO`/`NO_PAGADO`,
    método `EFECTIVO`/`TRANSFERENCIA`/`OTRO`, fecha, referencia opcional).
  - Detalle de grupo (`AcademyGroupDetailPage`): columna "Colegiatura" con badge de estado del periodo
    actual (`TuitionStatusBadge`) y botón "Marcar pago" que abre `MarkPaymentModal` para registrar
    o revertir el pago.
  - Vista de atrasados (`/academy/overdue`, `AcademyOverduePage`): tabla de pagos con `status = NO_PAGADO`
    y `period_end < hoy`, filtrable por grupo, con columnas Alumno, Grupo, Tutor, Teléfono, Periodo,
    Monto, Días de atraso, y acción "Marcar pagado" inline.
  - Navegación: link "Colegiaturas" en `AdminLayout` y botón "Colegiaturas" en grid de `HomePage`.
  - Manejo de errores con `getErrorMessage.ts`, Zod en formularios, `noValidate`, cierre con Escape.
- **HomePage** (`apps/admin`): rediseñado de saludo de texto a panel de
  botones grandes (grid con Instructores, Clases, Paquetes, Clientes,
  Alumnos, Academia), cada uno navega a su ruta via `Link` de React Router.
- **AdminLayout** (navegacion del panel): barra horizontal con links
  (Inicio, Instructores, Clases, Paquetes, Clientes, Alumnos, Academia), NavLink con
  estado activo resaltado, boton de cerrar sesion (SignOutButton).
- **Rutas protegidas**: todas bajo `RequireAuth` + `AdminLayout` en
  `apps/admin/src/App.tsx` (incluyendo `/academy/groups` y `/academy/groups/:id`).

Nada en `apps/web` excepto Google OAuth + email/password login. Ningun
otro negocio (Studio packages, bookings, Academia) implementado todavia.

## Funcionalidades implementadas en `apps/web` (Cliente)

- **Landing Page** (`/`): información de la academia desde tabla `business` (logo, nombre, descripción, dirección, teléfono, WhatsApp), accesos rápidos a Paquetes y Horarios.
- **Paquetes** (`/packages`): catálogo de paquetes activos con precio, créditos y vigencia; detalle en `/packages/:id` con botón "Consultar por WhatsApp" y placeholder "Comprar (próximamente)".
- **Horarios** (`/classes`): calendario semanal navegable (selector de semana + botón "Hoy"), tarjetas de clase con horario, instructor, cupo; botones contextuales según estado:
  - Cupo + créditos → "Reservar" (consume 1 crédito vía RPC `book_class`)
  - Cupo + 0 créditos → "Sin créditos" (disabled)
  - Sin cupo + no en waitlist → "Unirse a lista de espera" (INSERT en `waitlist` con RLS own)
  - Sin cupo + en waitlist → badge posición + "Salir" (DELETE own)
  - Ya reservado → badge "Reservado" + "Cancelar" (RPC `cancel_booking`, devuelve crédito)
- **Mi horario** (`/my-bookings`): lista de reservaciones activas con botón cancelar, lista de espera con posición FIFO y botón salir, badge de créditos (`💎 N`).
- **Perfil** (`/profile`): ver/editar nombre y teléfono, muestra email, rol, fecha de registro, botón cerrar sesión.
- **Navegación inferior fija** (mobile-first): Inicio, Paquetes, Horarios, Usuario.
- **Auth**: Google OAuth + email/password, `RequireAuth` con carga de perfil, `signOut` en contexto.
- **Créditos**: balance visible en nav y páginas, se actualiza tras reservar/cancelar.

## Integraciones configuradas

- **Supabase**: proyecto (`MBA-STUDIO`, ref `eazyblybekyygimqpjjw`, region
  `us-east-1`) con 12 tablas (`business`, `profiles`, `instructors`,
  `studio_classes`, `packages`, `admin_allowed_emails`, `dependents`,
  `bookings`, `waitlist`, `customer_credits_ledger`, `academy_tuition_periods`,
  `academy_payments`) y RLS
  (ver "Migraciones existentes"). Se usa
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
- `010_dependents.sql` — tabla `dependents` (alumnos de un cliente,
  ej. hijos, usados para inscripciones de Academia): `guardian_id` FK a
  `profiles`, `business_id` FK a `business`, `full_name`, `birth_date`
  opcional, `active` booleano. RLS: solo `STAFF`/`BUSINESS_ADMIN` de su
  `business_id` o `SUPER_ADMIN` pueden leer/escribir; sin policy de
  autoservicio del cliente todavia.
- `011_bookings.sql` — tablas `customer_credits_ledger`, `bookings`
  (`unique index` en `class_id, customer_id` con `status = 'CONFIRMED'`
  para evitar reservas duplicadas activas), `waitlist` (`unique index` en
  `class_id, customer_id`); 4 funciones `security definer` con
  `search_path` fijo (`book_class`, `cancel_booking`,
  `promote_from_waitlist`, `grant_credits`) que validan cupo/credito con
  `for update` (bloqueo de fila, evita condiciones de carrera), mas rol
  (`STAFF`/`BUSINESS_ADMIN`/`SUPER_ADMIN`) y tenant internamente; RLS de
  `bookings`/`customer_credits_ledger` solo permite `select` (toda
  escritura pasa por las 4 funciones), `waitlist` permite INSERT/DELETE
  directos con RLS normal staff-scoped. El archivo en el repo ya incluye
  el fix de seguridad de rol/tenant descrito en "Known Issues" arriba —
  no quedo una migracion `011_bookings_authz_fix.sql` separada en
  `supabase/migrations/` porque el fix se aplico editando el 011 antes de
  hacer merge (todavia no compartido), reaplicando solo los cuerpos de
  las funciones al proyecto de Supabase via `apply_migration` con nombre
  `011_bookings_authz_fix` (visible en el historial de migraciones de
  Supabase, no como archivo nuevo en el repo).
- `012_academy_groups.sql` — tablas `academy_groups` (nombre, instructor opcional,
  booleano `active`), `academy_group_schedules` (denormaliza `business_id`, dia 0-6,
  horas inicio/fin, orden de tiempo con check), y `academy_enrollments` (`dependent_id`,
  `group_id`, `enrollment_date`, `status` `'ACTIVA'|'BAJA'`; unique index condicional
  `academy_enrollments_active_unique` para evitar inscripciones activas duplicadas del
  mismo alumno al mismo grupo). RLS habilitado en las tres tablas con politicas
  staff-scoped (`STAFF`, `BUSINESS_ADMIN`, `SUPER_ADMIN`).
- `013_dependents_unregistered_guardians.sql` — relaja `dependents.guardian_id` a nullable,
  agrega `guardian_name` y `guardian_phone`, y añade check constraint `dependents_guardian_check`
  para dar soporte a alumnos cuyos tutores pagan en mostrador sin cuenta Auth.
- `014_academy_tuition.sql` — tablas `academy_tuition_periods` (configuración de periodo de cobro
  por grupo: día fijo del mes o aniversario de inscripción, monto en centavos) y `academy_payments`
  (registro de pago por inscripción y periodo: estado `PAGADO`/`NO_PAGADO`, método, fecha, referencia).
  RLS staff-scoped en ambas tablas.
- `015_web_bookings_rls.sql` — policies RLS customer-scoped para `bookings` (`bookings_own_select`),
  `customer_credits_ledger` (`credits_ledger_own_select`) y `waitlist` (`waitlist_own_manage`),
  permitiendo al cliente leer/escribir solo sus propios datos; las 4 funciones RPC existentes
  (`book_class`, `cancel_booking`, `promote_from_waitlist`, `grant_credits`) se consumen desde web.

Decision pendiente de validar con uso real: `studio_classes` e
`instructors` son de lectura publica (catalogo/marketing) por decision
explicita del usuario; `packages` solo expone los activos publicamente.

## Deployment actual

Ningun deploy de frontend todavia (Cloudflare Pages pendiente de
configurar, ver "Next Task"). El proyecto de Supabase ya tiene las
migraciones aplicadas (ver "Migraciones existentes" arriba), pero no hay
Edge Functions desplegadas ni frontend desplegado en Cloudflare Pages.

## Next Task

PR #1 (migraciones), PR #2 (Google OAuth web), PR #3 (email/password), PR #4
(login admin), PR #5 (admin CRUD clases+instructores + navegacion), PR #6
(pulido Minor de PR #5), el PR de `feat/admin-packages` (CRUD de paquetes),
PR #8 (`feat/admin-customers`, Clientes + Alumnos), PR #9 (`feat/admin-bookings`,
Reservaciones + Lista de Espera + Creditos), PR #10 (`feat/admin-academy-groups`,
Academia Grupos + Inscripciones) y PR #11 (`feat/admin-academy-unregistered-guardians`,
Academia Clientes sin cuenta) ya mergeados a `develop`.
El sub-proyecto `Academia — Colegiaturas` (rama `feat/admin-academy-tuition`)
esta completo y verificado por codigo (typecheck/lint/build sin errores en
ambas apps) y por revision de diseno/calidad, pendiente de merge via Pull Request.

**Implementado en `apps_web` (Cliente):**
- Reservaciones, lista de espera y créditos (rama `feat/web-bookings-credits`):
  migración `015_web_bookings_rls.sql` (RLS customer-scoped), catálogo paquetes,
  calendario semanal con botones contextuales (Reservar / Lista de espera / Cancelar),
  página `/my-bookings` (mis reservaciones + waitlist), perfil editable,
  navegación inferior mobile-first, badge de créditos. Verificado typecheck/lint/build.

**Proximo sub-proyecto acordado despues de Colegiaturas:**
Ninguno — la Academia está completa (Grupos, Inscripciones, Clientes sin cuenta, Colegiaturas).
El sub-proyecto `Academia — Asistencia` (punto 18d del roadmap original) fue descartado
por orden de la directora. No se implementará ninguna funcionalidad de asistencia.

Orden completo restante del roadmap (feature-driven):
Pagos (Stripe Checkout + Webhook) → Dashboard/Notificaciones/Settings.

Para despues del roadmap feature (vueltas de pulido/integration/testing):
- Recuperacion de contrasena y reenvio de verificacion de email en `apps_web`.
- Proteccion de rutas por rol dentro de `apps_web` (hoy `RequireAuth` ahi
  solo protege por "hay sesion o no"; en `apps_admin` ya hay gate de rol).
- Configurar los dos proyectos de Cloudflare Pages (`apps_web`, `apps_admin`)
  siguiendo `docs/deployment.md` — paso 23 del roadmap original.
