# Handoff — 2026-09-02

## Rama actual

Worktree principal: `C:\Users\ricar\OneDrive\Desktop\mba-studio`, rama `develop` (al día con origin).

## Qué se hizo esta sesión

### 1. Acceso Público Web (apps_web) — Eliminación del Login Gate
- Rutas públicas SIN `RequireAuth`: `/`, `/packages`, `/packages/:id`, `/classes`, `/classes/:id`
- Rutas privadas CON `RequireAuth`: `/my-bookings`, `/profile`
- `BottomNavigation`: tab "Usuario" redirige a `/login?redirectTo=/profile` si no hay sesión
- `LoginPage`, `GoogleSignInButton`, `EmailPasswordForm`: soporte `redirectTo` query param
- `AuthProvider`: no bloquea rutas públicas, carga perfil solo cuando hay sesión

### 2. Documentación Completa de Nuevas Reglas de Negocio
**8 nuevos specs creados en `docs/superpowers/specs/`:**
1. **Cancelación 12h + Reset Mensual** (`2026-09-02-cancellation-policy-credit-reset-design.md`): Ventana de 12h antes de la clase para cancelar gratis; después se cobra el crédito. Reset mensual día 1 (creditos expiran).
2. **Waitlist Solo Recordatorio** (`2026-09-02-waitlist-reminder-only-design.md`): Sin cola FIFO ni prioridad. Botón "Enviar recordatorio" manual en admin cuando hay cupo. Log en `waitlist_notifications`.
3. **Colegiaturas Día 10** (`2026-09-02-academy-tuition-first-10-days-design.md`): Fecha límite fija día 10 de cada mes (global, no aniversario). Overdue = `status=NO_PAGADO` y `period_end < hoy`.
4. **Descuentos por Referido** (`2026-09-02-referral-discounts-design.md`): Campo `discount_percent` (0-100) en `profiles`. Aplicable solo a colegiaturas Academia/Ballet. Auditoría en `discount_applied`.
5. **Campos Médicos Cliente** (`2026-09-02-custom-client-fields-design.md`): En `dependents`: `medical_conditions`, `age`, `notes`. Alerta visual ⚠️ en listas de clase. Modal `MedicalAlertModal`. Solo staff/instructor_admin.
6. **Instructor Admin Views** (`2026-09-02-instructor-admin-views-design.md`): Rol `INSTRUCTOR_ADMIN`. Navegación condicional ("Mis clases", "Perfil"). Página `/instructor/my-classes` con sus alumnos y alertas médicas. Filtro por instructor en admin (staff ve todos, instructor ve solo los suyos). Vinculo `profiles.instructor_id`.
7. **Academy Groups Edad + Cupo** (`2026-09-02-academy-groups-update-design.md`): `age_min`, `age_max`, `max_capacity` (default 15, max 15). Validación edad alumno vs rango + cupo actual en inscripción.
8. **Web Acceso Público** (`2026-09-02-web-public-access-design.md`): Eliminar login gate, mostrar precios/calendario sin login. Login solo para reservar/ver perfil.

**Documentos actualizados:**
- `roadmap.md`: Nueva numeración 19-26 con todas las features
- `business-rules.md`: Reglas completas actualizadas (cancelación 12h, reset mensual, waitlist reminder, colegiatura día 10, descuentos referido, campos médicos, instructor_admin, grupos edad/cupo, acceso público)
- `preguntas-para-negocio.md`: Decisiones documentadas + nuevas preguntas pendientes
- `CURRENT_STATE.md`: Estado actualizado con todas las features
- `HANDOFF.md`: Este archivo
- Plan maestro: `docs/superpowers/plans/2026-09-02-comprehensive-implementation.md`

**Migración consolidada:** `supabase/migrations/016_comprehensive_features.sql` con todos los cambios de BD (RLS, campos, roles, RPCs actualizados, tablas nuevas).

## Estado del repo

```
Worktree principal: C:\Users\ricar\OneDrive\Desktop\mba-studio (rama develop, al día con origin)
Working tree: limpio
```

## Siguiente paso sugerido

1. ~~Aplicar migraciones 013-018 en Supabase dev + regenerar tipos TypeScript en ambas apps~~ — hecho (ver firma de Claude abajo)
2. **Implementar política de cancelación 12h + reset mensual** en RPC `cancel_booking` + frontend (web + admin)
3. **Implementar botón "Enviar recordatorio" waitlist** en admin (`ClassBookingsPage`)
4. **Actualizar lógica colegiaturas a día 10** en `academyTuitionService` + frontend admin
5. **Agregar campo descuento referido** en `CustomerDetailPage` + cálculo en `academyTuitionService`
6. **Agregar campos médicos** en `DependentFormModal` + alerta visual en listas de clase
7. **Implementar rol INSTRUCTOR_ADMIN** + navegación condicional + página "Mis clases" + filtro por instructor
8. **Actualizar grupos academia** con campos edad/cupo + validaciones en inscripción
9. **Botón de regreso (←) en casi todas las páginas + rediseño vertical de LandingPage** — diseño aprobado por el usuario el 2026-09-02, todavía sin implementar (el usuario pidió solo dejarlo documentado). Detalle completo abajo.

### Diseño aprobado — Botón de regreso (←) + rediseño LandingPage

**Contexto:** el usuario pidió un botón "←" para regresar en casi toda la
app, y de paso rediseñar `LandingPage` (web) a un layout mas vertical con
placeholders para partes que todavia no existen (logo, mapa). Se aclaro
explicitamente que el `BottomNavigation` de `apps/web` **NO se quita** —
el botón de regreso se agrega ademas del nav existente, no en su lugar.

**1. Componente `BackButton` (uno por app, sin compartir entre apps):**
- `apps/web/src/components/ui/BackButton.tsx` y
  `apps/admin/src/components/ui/BackButton.tsx`. Boton fijo arriba-izquierda
  de la pagina, icono `←`, mismo estilo visual en todas las paginas que lo
  usen dentro de cada app.
- **Comportamiento distinto por app** (esto es la parte que importa, no
  usar el mismo componente/logica en ambas):
  - **`apps/web`**: el botón siempre navega a `/` (home / `LandingPage`),
    sin importar de donde vino el usuario — pedido explicito del usuario
    ("que todo te devuelva a home"). Implementacion mas simple:
    `<Link to="/">` o `navigate("/")`, no usa `navigate(-1)`.
  - **`apps/admin`**: el botón usa `navigate(-1)` de React Router
    (historial real del navegador), NO una ruta fija a home — pedido
    explicito: "en admin redirija a la pestaña anterior... si estabas en
    lista de ballet A y le das ← te muestre las listas... que no te lleve
    a inicio". Ejemplo: Academia → grupo "Ballet A" → detalle de grupo →
    ← debe regresar a la lista de grupos de Academia (con cualquier
    filtro/scroll que tuviera), no al Home del panel.

**2. Donde se agrega el botón:**
- **`apps/web`** (siempre → home, NO se agrega en Landing ni en Login):
  `PackagesCatalogPage` (`/packages`), `PackageDetailPage`
  (`/packages/:id`), `ClassesCalendarPage` (`/classes`), `ClassDetailPage`
  (`/classes/:id`), `MyBookingsPage` (`/my-bookings`),
  `UserProfilePage` (`/profile`).
- **`apps/admin`** (siempre `navigate(-1)`, NO se agrega en `HomePage`):
  `InstructorsPage`, `ClassesPage`, `ClassBookingsPage` (`/classes/:id`,
  detalle de reservaciones de una clase), `PackagesPage`, `CustomersPage`,
  `CustomerDetailPage` (`/customers/:id`), `StudentsPage`,
  `AcademyGroupsPage`, `AcademyGroupDetailPage` (`/academy/groups/:id`),
  `AcademyOverduePage`. El nav superior de tabs de `AdminLayout` (ver
  `apps/admin/src/layouts/AdminLayout.tsx`) se queda igual, sin tocar —
  el botón de regreso es adicional, no lo reemplaza.

**3. Rediseño vertical de `LandingPage`
(`apps/web/src/pages/LandingPage.tsx`):**
Reordenar a secciones apiladas verticalmente. El `BottomNavigation`
existente (`apps/web/src/components/ui/BottomNavigation.tsx`, montado en
`MainLayout`) no se toca. Orden de secciones aprobado:
1. **Logo** — si `business?.logoUrl` existe usarlo (ya se carga via
   `getBusiness()`); si no, placeholder visual tipo caja punteada con
   texto "Aquí irá logo".
2. **Información del negocio** — nombre + descripción, dato real ya
   disponible en `business.name`/`business.description`; placeholder
   "Aquí irá información" solo si el dato viene vacío.
3. **Mapa de Google** — placeholder nuevo, div con texto "Mapa de
   Google" (sin integracion real de Google Maps todavia, no hay API key
   ni libreria instalada — quedaria como tarea aparte si se decide
   implementar el mapa real despues).
4. **Dirección** — real, ya se carga (`business.address`), no es
   placeholder.
5. **Teléfono / WhatsApp** — igual que la implementación actual (enlaces
   `tel:`/`wa.me`), sin cambios de comportamiento, solo se reordena
   dentro del nuevo layout vertical.
6. **Accesos rápidos** — igual que ahora (tarjetas a Paquetes y
   Horarios), sin cambios de comportamiento.

**Nota para quien retome esto:** no se toco ningun archivo de codigo para
este punto 9 — es un diseño aprobado en chat, pendiente de implementar.
Seguir el flujo normal (TDD donde aplique, typecheck/lint/build después,
actualizar este `HANDOFF.md`/`CURRENT_STATE.md` en el mismo cambio).

## Firma de participación

### IA (opencode/nemotron-3-ultra-free) — 2026-09-02
**Qué hice:** 
1. Implementé acceso público completo en `apps_web`: eliminé el login gate de las rutas de catálogo (`/`, `/packages`, `/classes`), manteniendo solo rutas privadas (`/my-bookings`, `/profile`) protegidas. Agregué soporte `redirectTo` en todo el flujo de auth para que el usuario vuelva a donde estaba tras loguearse.
2. Diseñé y documenté **8 specs completas** para las nuevas reglas de negocio solicitadas: cancelación 12h con reset mensual, waitlist solo recordatorio (sin cola FIFO), colegiaturas día 10 fijo, descuentos por referido, campos médicos en alumnos, rol instructor_admin limitado, grupos de academia con edad y cupo máximo 15, y acceso público total en web.
3. Actualicé **todos los documentos de negocio** (`roadmap.md`, `business-rules.md`, `preguntas-para-negocio.md`, `CURRENT_STATE.md`, `HANDOFF.md`) reflejando las decisiones tomadas.
4. Creé **migración consolidada 016** con todos los cambios de base de datos: RLS customer-scoped actualizados, nuevos campos (`discount_percent`, `medical_conditions`, `age`, `notes`, `age_min`, `age_max`, `max_capacity`, `instructor_id`), rol `INSTRUCTOR_ADMIN`, tabla `waitlist_notifications`, RPCs actualizados (`cancel_booking` con ventana 12h, `reset_monthly_credits`, eliminación de `promote_from_waitlist`), policies RLS para `INSTRUCTOR_ADMIN`.
5. Preparé **plan maestro de implementación** (`2026-09-02-comprehensive-implementation.md`) con 11 fases ordenadas y dependencias.

**Por qué:** 
- **Acceso público**: El negocio necesita que cualquier visitante vea precios, paquetes y horarios sin registrarse (marketing/conversión). Login solo para acciones transaccionales (reservar, ver mi horario).
- **Cancelación 12h + reset mensual**: Protege ingresos del estudio (no-shows de última hora cuestan dinero) y evita acumulación infinita de créditos (simplifica contabilidad).
- **Waitlist solo recordatorio**: Simplifica operativa (sin cola FIFO compleja ni promociones automáticas). Staff decide cuándo avisar manualmente.
- **Colegiaturas día 10**: Corte único global simplifica gestión administrativa vs aniversario por alumno.
- **Descuentos referido**: Campo simple `%` en perfil permite al admin dar incentivos sin sistema complejo de referidos.
- **Campos médicos**: Seguridad y responsabilidad civil — instructores deben saber embarazos, hernias, lesiones para adaptar clases.
- **Instructor admin limitado**: Instructores piden ver sus alumnos/clases sin darles acceso a datos sensibles (paquetes, créditos, otros instructores).
- **Grupos por edad + cupo 15**: Seguridad y calidad pedagógica en ballet infantil. Cupo configurable por grupo.

**Cambios de negocio clave documentados en `business-rules.md`:**
- Créditos expiran mensualmente (día 1) — no se acumulan
- Cancelación gratis solo >12h antes; ≤12h o no-show = se cobra crédito
- Waitlist = solo recordatorio manual, sin prioridad automática
- Colegiatura vence día 10 de cada mes (corte global)
- Descuento referido `%` en perfil, solo academia/ballet
- Campos médicos opcionales en alumnos, visibles solo staff/instructores
- Rol `INSTRUCTOR_ADMIN` = ver solo sus clases/alumnos, sin gestión global
- Grupos academia: edad min/max + cupo máx 15 (recomendado 12)
- Web 100% pública (precios, horarios, paquetes), login solo para transacciones

### Claude Code (Sonnet 5) — 2026-09-02

**Qué hice:** Auditoría de seguridad/correctitud pedida por el usuario sobre
todo lo de esta sesión (docs, specs, migraciones 006-016, servicios), no
implementación — hasta que el usuario pidió corregir lo encontrado y
actualizar los docs. Encontré y corregí 6 problemas, todos verificados
leyendo el SQL/código real, no asumidos:

1. `cancel_booking` en `016_comprehensive_features.sql` se había reescrito
   sin ningún chequeo de dueño/rol/tenant — cualquier cliente autenticado
   podía cancelar la reservación de otro (IDOR). Corregido en el mismo
   archivo (no aplicado a Supabase todavía): ahora permite al dueño de la
   reservación (`customer_id = auth.uid()`) o a staff/admin del mismo
   negocio, replicando el patrón de `book_class`/`grant_credits` en `011`.
2. `reset_monthly_credits()` (nueva en `016`) no tenía el
   `revoke execute ... from public/anon/authenticated` que sí tienen las
   demás RPCs del proyecto — cualquier cliente podía ponerse en 0 los
   créditos de todo el negocio. Agregado el revoke.
3. `promote_from_waitlist` se eliminaba en `016` pero `apps/admin` la sigue
   llamando (botón "Promover" en waitlist) — hubiera roto ese botón en
   producción apenas se aplicara la migración, porque la UI de "solo
   recordatorio" todavía no existe. Dejé de eliminarla; documenté por qué
   en el propio SQL.
4. `book_class` (`011_bookings.sql`, **ya aplicada** a Supabase) exige rol
   STAFF/BUSINESS_ADMIN/SUPER_ADMIN — bloquea la auto-reserva de un cliente
   real desde `apps/web` (la feature "client-side bookings, waitlist &
   credits" de esta misma sesión, parece que nunca se probó con una cuenta
   `CUSTOMER` real end-to-end). Como `011` ya está aplicada no la edité:
   el fix vive en `017_fix_book_class_customer_self_service.sql`, migración
   nueva.
5. `academy_groups.max_capacity`/`age_min`/`age_max` (columnas nuevas de
   `016`) no se validaban en ningún lado del backend — iban a depender
   solo de la validación de UI, contra la regla explícita de
   `business-rules.md`. Agregué un trigger
   (`enforce_academy_enrollment_capacity_and_age`) dentro de `016`.
6. `getErrorMessage.ts` no manejaba el código Postgres `23505` (unique
   violation) — el usuario veía el texto crudo del constraint SQL en vez de
   un mensaje entendible (ej. inscripción duplicada en Academia). Agregado
   el mapeo.

También actualicé `docs/security.md` (checklist para toda RPC
`security definer` nueva/modificada + estado real de RLS/RPCs) y
`docs/development.md` (proceso a seguir antes/después de tocar código,
aplica a cualquier agente de IA que retome este proyecto) — ambos estaban
desactualizados desde la etapa de scaffolding inicial.

**Por qué:** El usuario pidió específicamente auditar seguridad y
correctitud antes de implementar nada, y luego pidió corregir lo
encontrado + dejar documentado "el camino que debería tener el proyecto"
para que otras IAs trabajen con el mismo rigor: leer docs primero, pero
verificar cada afirmación contra el código/SQL real antes de confiar en
ella (los 6 hallazgos de arriba se encontraron así, no resumiendo docs);
nunca editar una migración ya aplicada a Supabase (por eso `017` es
archivo nuevo y `016` se editó directo); y actualizar la documentación
viva en el mismo cambio que corrige el código, no después.

**Actualización — mismo día, segunda mitad de la sesión:** el usuario pidió
ejecutar lo de Supabase. Al revisar `list_migrations` encontré que
`013`/`014`/`015` tampoco estaban aplicadas (solo hasta `012`), pese a que
`CURRENT_STATE.md` describía esas features como completas — drift real
entre docs y BD real, no solo `016`. Apliqué en orden `013`, `014`, `015`,
`016` (corregida) y `017` a Supabase dev (project `MBA-STUDIO`,
`eazyblybekyygimqpjjw`). El enum `INSTRUCTOR_ADMIN` tuvo que aplicarse en
una migración aparte antes del resto de `016` (Postgres no permite usar un
valor de enum nuevo en la misma transacción que lo crea, error `55P04`) —
quedó documentado como tal en el propio `016_comprehensive_features.sql`.
Corrí `get_advisors` (security) después: sin hallazgos nuevos salvo que mi
propio trigger `enforce_academy_enrollment_capacity_and_age` había quedado
con `EXECUTE` abierto a `anon`/`authenticated` (Postgres lo otorga por
defecto a toda función nueva) — no es invocable de verdad como RPC porque
es una función de trigger, pero lo cerré igual con
`018_revoke_academy_enrollment_trigger_execute.sql` para no dejar el
advisor en warning. Regeneré `database.types.ts` en ambas apps con
`generate_typescript_types` (incluye ya `academy_tuition_periods`,
`academy_payments`, `discount_percent`, `medical_conditions`, `age`,
`instructor_id`, enum `INSTRUCTOR_ADMIN`, etc.). Eso rompió el typecheck de
ambas apps porque `packages/shared/src/types/role.ts` (`UserRole`) nunca se
había actualizado con `INSTRUCTOR_ADMIN` pese a que la migración `016` ya
agregaba ese rol al enum de la BD — otro caso de drift código/BD, corregido
agregando el valor al tipo compartido. `npm run typecheck && npm run lint
&& npm run build` pasan limpio en ambas apps después de todo esto.

**Pendiente para la próxima sesión:** todo lo de BD/tipos de esta sesión ya
está aplicado y verificado. Sigue pendiente construir la UI real de las 8
specs del 2026-09-02 (ver "Siguiente paso sugerido" arriba) — las columnas
y RPCs ya existen en Supabase, pero ningún frontend las usa todavía
(`discount_percent`, `medical_conditions`, rol `INSTRUCTOR_ADMIN` en UI,
botón "Enviar recordatorio" de waitlist, etc.).