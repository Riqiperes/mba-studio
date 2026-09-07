# Academia — Inscripción propia (self-service) en `apps/web`

Fecha: 2026-09-07
Estado: **No implementado.** Documentado para retomar como su propio
sub-proyecto (brainstorming → spec → plan → implementación) cuando le
toque en el roadmap. Lo único que sí se implementó en esta fecha fue el
catálogo de solo lectura + botón de WhatsApp — ver
`docs/CURRENT_STATE.md` y la migración `026_academy_groups_public_read.sql`.

## Contexto

Antes de este documento, `apps/web` no tenía ninguna forma de ver ni
inscribir a Academia: `academy_groups`, `academy_group_schedules`,
`academy_enrollments` y `dependents` eran 100% staff-scoped (RLS sin
ninguna policy de cliente). Se implementó primero una versión mínima
(catálogo público de grupos + botón "Inscribir por WhatsApp" que manda
un mensaje a la academia) para no bloquear a los clientes mientras se
construye el flujo real. Este documento describe ese flujo real
pendiente.

## Decisiones ya tomadas con el usuario

- **La inscripción NO es inmediata.** El cliente manda una solicitud;
  un miembro de staff debe aprobarla antes de que quede `ACTIVA`. (A
  diferencia de reservar una clase de Studio, que sí es autoservicio
  inmediato.)
- **Alta de alumno inline.** Si el cliente no tiene todavía un alumno
  (`dependents`) cargado, lo crea en el mismo paso del flujo de
  solicitud (nombre + fecha de nacimiento opcional), sin pantalla
  separada de "Mis alumnos".
- **Cobro automático queda fuera de alcance hasta que exista Stripe.**
  Ver "Cobro automático" abajo.

## Diseño propuesto (para cuando se retome)

### Base de datos

- `academy_enrollments.status` hoy es `'ACTIVA' | 'BAJA'` (check
  constraint, migración `012`). Agregar `'PENDIENTE'` a ese check
  constraint. El trigger `enforce_academy_enrollment_capacity_and_age`
  (016, corregido en 023) ya solo valida cupo/edad cuando
  `new.status = 'ACTIVA'` — una solicitud en `PENDIENTE` no consume
  cupo hasta que un admin la aprueba (aprobar = `UPDATE status =
  'ACTIVA'`, dispara la validación de cupo/edad automáticamente, sin
  código nuevo en el trigger).
- RLS nueva necesaria (ninguna existe hoy para clientes en estas
  tablas):
  - `dependents`: policy para que un `CUSTOMER` autenticado pueda
    `INSERT`/`SELECT` sus propios alumnos (`guardian_id = auth.uid()`).
  - `academy_enrollments`: policy para que un `CUSTOMER` pueda
    `INSERT` una solicitud (`status = 'PENDIENTE'` forzado, nunca
    `ACTIVA` directo) para un `dependent_id` que le pertenezca, y
    `SELECT` sus propias solicitudes/inscripciones.
  - `academy_groups` / `academy_group_schedules`: la lectura pública ya
    existe (`026_academy_groups_public_read.sql`), no requiere cambios.
- Admin (`apps/admin`): la vista de detalle de grupo
  (`AcademyGroupDetailPage`) necesita una sección "Solicitudes
  pendientes" con botones Aprobar/Rechazar sobre las filas
  `PENDIENTE`.

### Frontend (`apps/web`)

- El botón "Inscribir por WhatsApp" de `AcademyGroupCard.tsx` se
  reemplaza por un modal de solicitud: selector de alumno existente
  (o "Agregar alumno nuevo" inline, mismo patrón que
  `EnrollStudentModal` de `apps/admin`) + confirmar. El WhatsApp queda
  como alternativa secundaria, no como único camino.
- Nueva vista "Mis solicitudes/inscripciones de Academia" (podría vivir
  dentro de `/profile` o como pestaña nueva) para que el cliente vea el
  estado (`PENDIENTE`/`ACTIVA`/`BAJA`) de sus alumnos.

## Cobro automático (fuera de alcance hasta Stripe)

No se implementa ningún cobro automático de colegiatura como parte de
este flujo. Hoy (y seguirá siendo así hasta que exista Stripe Checkout
+ Webhook, etapa 14 del roadmap) el staff sigue marcando manualmente
`PAGADO`/`NO_PAGADO` en `academy_payments` desde `apps/admin`
(`MarkPaymentModal`), sin cambios.

Cuando Stripe esté implementado, conectar así (no antes):

1. Al aprobar una solicitud de inscripción (`status` pasa a `ACTIVA`),
   crear automáticamente el primer registro de `academy_payments`
   `NO_PAGADO` para el periodo vigente de `academy_tuition_periods` del
   grupo (si no existe ya).
2. Ese registro dispara un Stripe Checkout (o una suscripción de Stripe
   Billing, a decidir con el negocio) en vez de esperar pago en
   efectivo/transferencia.
3. El webhook de Stripe marca `academy_payments.status = 'PAGADO'`
   igual que ya hace (o hará) para paquetes de Studio — mismo patrón,
   nunca confiar en un `payment_success` del frontend (ver
   `docs/payments.md`).

No hay que tocar nada de esto hasta que la etapa 14 (Stripe) esté
terminada y verificada.
