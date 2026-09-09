# Academia — Autoservicio de inscripción + visibilidad de altas para admins

Fecha: 2026-09-09
Estado: **Aprobado, pendiente de implementación.**

Este documento reemplaza y extiende
`docs/superpowers/specs/2026-09-07-academy-web-self-enrollment-design.md`
(marcado ahí como "no implementado"). Incorpora dos requisitos nuevos que
el spec anterior dejaba fuera:

1. Un botón **dummy** de "pagar inscripción" (cuota de inscripción única,
   distinta de la colegiatura mensual) que registra el pago sin pasar por
   Stripe — el spec anterior asumía cero cambios en pagos hasta que
   existiera Stripe.
2. Agendar **clase muestra** (trial class) para un dependiente.
3. Que el staff se entere de altas nuevas sin tener que buscarlas
   manualmente (badge/contador en `apps/admin`).

## Contexto

Hoy `apps/web` solo tiene un catálogo de solo lectura de grupos de
Academia con un botón "Inscribir por WhatsApp"
(`AcademyGroupCard.tsx`, migración `026_academy_groups_public_read.sql`).
No existe ningún flujo real de autoservicio: un cliente no puede crear un
alumno (`dependents`), inscribirlo, ni agendar una clase muestra desde la
app. Todo pasa hoy por WhatsApp + alta manual del staff en `apps/admin`.
Eso significa que, si en el futuro se agrega cualquier forma de
autoservicio sin un paso de aprobación explícito, un padre podría
"inscribir" a su hijo sin que ningún admin se entere — el diseño de abajo
cierra ese hueco a propósito.

## Decisiones ya tomadas con el usuario (esta sesión)

- El botón de "pagar inscripción" es explícitamente **dummy**: al hacer
  clic, se marca como pagado en la base de datos sin ningún cobro real.
  No hay Stripe involucrado todavía.
- El monto de la cuota de inscripción es **fijo y global** al negocio
  (no varía por grupo).
- "Clase muestra" es una reserva sobre un horario (`academy_group_schedules`)
  ya existente de un grupo, no una solicitud sin horario.
- El aviso a admins es un **badge/contador** en el panel (`apps/admin`),
  visible la próxima vez que el staff entra — no se agrega WhatsApp
  automático al staff en esta iteración.

## Decisiones heredadas del spec anterior (siguen vigentes)

- La inscripción real (`PENDIENTE` → `ACTIVA`) **no es inmediata**: un
  admin debe aprobarla. Esto es justamente lo que garantiza que el admin
  se entera de cada alta — no hay forma de llegar a `ACTIVA` sin pasar por
  esa aprobación.
- Alta de alumno (`dependents`) inline, en el mismo paso del flujo de
  solicitud, sin pantalla separada de "Mis alumnos".
- Cobro de colegiatura sigue siendo 100% manual por staff en
  `academy_payments` (`MarkPaymentModal`), sin cambios — solo la cuota de
  inscripción es dummy, la colegiatura mensual no se toca.

## Diseño

### Base de datos (migración nueva `027_academy_self_enrollment.sql`)

- `academy_enrollments.status`: el check constraint (migración `012`,
  hoy `'ACTIVA' | 'BAJA'`) se amplía a
  `'ACTIVA' | 'BAJA' | 'PENDIENTE' | 'MUESTRA'`.
- `academy_enrollments` gana columnas nuevas, todas nullable:
  - `schedule_id uuid references academy_group_schedules(id)` — solo se
    llena cuando `status = 'MUESTRA'`, identifica el horario elegido.
  - `trial_date date` — solo se llena cuando `status = 'MUESTRA'`, la
    fecha concreta de la visita.
  - `registration_fee_paid boolean not null default false`.
  - `registration_fee_paid_at timestamptz`.
- El trigger `enforce_academy_enrollment_capacity_and_age` (016, fix en
  023) **no cambia**: ya solo valida cupo/edad cuando
  `new.status = 'ACTIVA'`, así que filas en `PENDIENTE`/`MUESTRA` no
  consumen cupo. Cuando un admin aprueba (`UPDATE status = 'ACTIVA'`), la
  validación de cupo/edad se dispara sola, sin código nuevo.
- `business` gana `academy_registration_fee_cents integer` — mismo
  patrón que la columna `whatsapp_number` ya existente: de lectura
  pública (la policy `business_select_public` ya cubre esto), sin UI de
  admin para editarla (tampoco existe hoy para `whatsapp_number`); se
  fija con un `UPDATE` directo cuando el negocio decida el monto real.
- RLS nueva (ninguna existe hoy para clientes en estas tablas):
  - `dependents`: policy para que un `CUSTOMER` autenticado haga
    `INSERT`/`SELECT` de sus propios alumnos (`guardian_id = auth.uid()`).
  - `academy_enrollments`: policy para que un `CUSTOMER` haga `INSERT`
    de una fila con `status in ('PENDIENTE', 'MUESTRA')` (nunca `ACTIVA`
    ni `BAJA` directo — forzado en el `with check`) para un
    `dependent_id` que le pertenezca (`EXISTS` contra `dependents` con
    `guardian_id = auth.uid()`), y `SELECT` de sus propias filas.
  - `academy_groups` / `academy_group_schedules`: la lectura pública ya
    existe (`026`), sin cambios.
- No se crea ninguna tabla nueva de pagos: la cuota de inscripción vive
  como columnas en `academy_enrollments` (relación 1:1 natural con la
  solicitud), no en `academy_payments` (que es específicamente para
  colegiatura recurrente por periodo y tiene su propio unique constraint
  por periodo).

### `apps/web` (lado del padre/tutor)

- `AcademyGroupCard.tsx`: el botón único "Inscribir por WhatsApp" se
  reemplaza por dos botones que abren modales:
  - **"Inscribir y pagar inscripción"** → `EnrollAndPayModal`: selector
    de alumno existente (de sus `dependents`) o "Agregar alumno nuevo"
    inline (nombre + fecha de nacimiento opcional, mismo patrón que
    `EnrollStudentModal` de `apps/admin`) → confirmar hace **un solo**
    INSERT a `academy_enrollments` con `status='PENDIENTE'`,
    `registration_fee_paid=true`, `registration_fee_paid_at=now()`. El
    botón se etiqueta visualmente como pago simulado (p.ej. "Pago de
    prueba — $X MXN" con una nota, no se disfraza de cobro real).
  - **"Agendar clase muestra"** → `TrialClassModal`: selector de alumno
    (mismo patrón) + selector de horario del grupo (`schedule_id`) +
    fecha (próxima ocurrencia de ese `day_of_week`, calculada en
    frontend) → INSERT con `status='MUESTRA'`, sin cobro.
  - El link de WhatsApp se conserva como alternativa secundaria (texto
    pequeño, no botón primario), para el padre que prefiere ese camino.
- Nueva vista simple, dentro de `/profile`: "Mis alumnos e inscripciones"
  — lista los `dependents` del cliente y, por cada uno, sus
  `academy_enrollments` con status (`PENDIENTE`/`MUESTRA`/`ACTIVA`/`BAJA`)
  para que sepa en qué quedó su solicitud sin tener que preguntar.
- Capa: `academyEnrollmentService.ts` nuevo en
  `features/academy/services/` (INSERT a `dependents` y a
  `academy_enrollments`, SELECT de "mis inscripciones"), consumido por
  hooks nuevos (`useMyDependents`, `useEnrollDependent`,
  `useScheduleTrialClass`), nunca Supabase directo desde componentes —
  regla del proyecto.

### `apps/admin` (lado staff)

- `AcademyGroupDetailPage.tsx` gana una sección nueva **"Solicitudes
  pendientes"**, arriba de la tabla de "Alumnos inscritos" existente,
  mostrando filas con `status in ('PENDIENTE', 'MUESTRA')` del grupo:
  - Fila `PENDIENTE`: nombre del alumno, tutor, si pagó inscripción
    (sí/no visual), botones **Aprobar** (`UPDATE status='ACTIVA'`,
    dispara la validación de cupo/edad del trigger; si falla por
    cupo/edad se muestra el error tal cual lo devuelva Postgres, mismo
    patrón de manejo de error que ya usa la página para `withdraw`) y
    **Rechazar** (`UPDATE status='BAJA'` — se conserva la fila como
    registro histórico, mismo patrón que "Dar de baja" ya usa en la
    tabla de alumnos inscritos, no se elimina).
  - Fila `MUESTRA`: nombre del alumno, horario, fecha, botón **Marcar
    atendida** (`UPDATE status='BAJA'` para sacarla de pendientes — una
    clase muestra no se convierte automáticamente en inscripción; si el
    padre quiere inscribirse de verdad después, es una solicitud nueva
    `PENDIENTE` separada).
  - Reutiliza `useAcademyGroupEnrollments` (extendido para incluir estos
    status) en vez de un hook paralelo.
- Badge/contador nuevo: en la card "Academia" de `HomePage.tsx` y en
  `AcademiaHubPage.tsx`, un número con el total de
  `PENDIENTE + MUESTRA` sin atender de todos los grupos del negocio.
  Query simple `count(*)` vía un hook `usePendingAcademyRequestsCount`
  (polling ligero al montar el layout, sin websockets/realtime — no hace
  falta esa complejidad para un contador que se refresca al navegar).

### Fuera de alcance (igual que el spec anterior)

- Cobro real de inscripción y de colegiatura vía Stripe: sigue en la
  etapa 14 del roadmap. El dummy de esta iteración se marca como tal en
  el código (nombre de función/comentario corto explicando que es
  temporal) para que quede trazable cuándo se reemplace.
- Notificación por WhatsApp al staff ante una solicitud nueva: no se
  construye ahora (el usuario eligió solo badge). Si se agrega después,
  ya existe la interfaz `NotificationProvider` para conectarlo sin tocar
  lógica de negocio.
- UI de admin para editar `academy_registration_fee_cents`: se fija por
  SQL directo, igual que `whatsapp_number` hoy.

## Testing

- DB: verificar que el check constraint amplía correctamente los
  status permitidos; verificar que el trigger de cupo/edad sigue sin
  disparar en `PENDIENTE`/`MUESTRA` y sí dispara al pasar a `ACTIVA`;
  verificar RLS con un usuario `CUSTOMER` de prueba (puede insertar
  `PENDIENTE`/`MUESTRA` propio, no puede insertar `ACTIVA` directo, no
  puede ver ni modificar dependientes/inscripciones ajenas).
- `apps/web`: flujo completo alta de alumno → inscribir y pagar
  (dummy) → aparece en "Mis alumnos e inscripciones" como `PENDIENTE`;
  flujo de clase muestra igual con `MUESTRA`.
- `apps/admin`: la solicitud aparece en "Solicitudes pendientes" del
  grupo correcto; Aprobar pasa a `ACTIVA` y aparece en "Alumnos
  inscritos"; el badge de `HomePage`/`AcademiaHubPage` refleja el
  conteo correcto y baja al aprobar/rechazar/marcar atendida.
