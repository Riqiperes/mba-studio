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

1. **Aplicar migración 016 en Supabase dev** + regenerar tipos TypeScript en ambas apps
2. **Implementar política de cancelación 12h + reset mensual** en RPC `cancel_booking` + frontend (web + admin)
3. **Implementar botón "Enviar recordatorio" waitlist** en admin (`ClassBookingsPage`)
4. **Actualizar lógica colegiaturas a día 10** en `academyTuitionService` + frontend admin
5. **Agregar campo descuento referido** en `CustomerDetailPage` + cálculo en `academyTuitionService`
6. **Agregar campos médicos** en `DependentFormModal` + alerta visual en listas de clase
7. **Implementar rol INSTRUCTOR_ADMIN** + navegación condicional + página "Mis clases" + filtro por instructor
8. **Actualizar grupos academia** con campos edad/cupo + validaciones en inscripción

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