# Diseño: Academia — Grupos + Inscripciones en `apps/admin`

## Contexto

Quinto sub-proyecto del panel administrativo (orden acordado: clases+
instructores → paquetes → clientes+alumnos → reservaciones+lista de
espera → **Academia (grupos+inscripciones)** → Academia (clientes sin
cuenta) → Academia (colegiaturas) → pagos →
dashboard/notificaciones/settings — ver `docs/roadmap.md` punto 18).

La tabla `dependents` ("Alumnos") ya existe desde el sub-proyecto de
Clientes+Alumnos y su propio comentario en
`supabase/migrations/010_dependents.sql` ya la describe como "usados
para inscripciones de Academia" — este sub-proyecto es exactamente eso:
darles un grupo al que inscribirse.

Durante el brainstorming surgió una necesidad real pero más grande
("clientes de mostrador" que pagan en efectivo y nunca crean una
cuenta) que se decidió sacar de este alcance porque requiere relajar
`dependents.guardian_id` (FK obligatoria hoy a `profiles`), una tabla ya
en producción que también usa el Studio — queda como sub-proyecto propio
(`docs/roadmap.md` punto 18b). Ver también
`docs/preguntas-para-negocio.md` puntos 11-13 (fechas de cobro, cupo por
grupo, información adicional por grupo — sin decidir con el negocio
todavía).

## Alcance

**Incluye:**
- CRUD de grupos de Academia (`academy_groups`): nombre, instructor
  opcional (reusa `instructors`), sin cupo máximo por ahora.
- Horario semanal por grupo (`academy_group_schedules`): varios días/horas
  por grupo (ej. Martes y Jueves), gestionados dentro del mismo formulario
  del grupo.
- Inscribir/dar de baja un Alumno (`dependents`) existente a un grupo
  (`academy_enrollments`), con fecha de inscripción (para saber después
  cuándo se cobra, aunque la lógica de cobro todavía no existe).
- Un Alumno puede estar inscrito en varios grupos a la vez.
- Crear un Alumno nuevo *inline*, sin salir de la lista de inscritos del
  grupo, siempre y cuando el Cliente (tutor) ya tenga cuenta — reusa
  `useCustomers()`/`useDependentsByGuardian()` ya existentes.

**No incluye (decisiones explícitas de esta sesión):**
- Vista de cliente en `apps/web` (que el tutor vea el horario de su
  Alumno) — sub-proyecto futuro, mismo patrón que reservaciones (el
  cliente tampoco reserva su propia clase todavía).
- Clientes sin cuenta ("clientes de mostrador") — el Cliente debe existir
  ya en `/customers` antes de inscribir a su Alumno. Si no tiene cuenta,
  no se puede inscribir todavía. Ver `docs/roadmap.md` punto 18b.
- Cupo máximo por grupo — ver `docs/preguntas-para-negocio.md` punto 12.
- Colegiaturas / estado de pago / cobro — ver punto 18c del roadmap.
- Asistencia por sesión — ver punto 18d del roadmap.
- Motivo de baja (solo cambio de estado, sin campo de texto).
- Nivel, edad mínima/máxima, salón u otra info adicional del grupo — ver
  `docs/preguntas-para-negocio.md` punto 13.

## Modelo de datos (migración `012`)

```sql
create table public.academy_groups (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.business (id),
  name text not null,
  instructor_id uuid references public.instructors (id),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.academy_group_schedules (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.business (id),
  group_id uuid not null references public.academy_groups (id) on delete cascade,
  day_of_week smallint not null check (day_of_week between 0 and 6), -- 0 = domingo
  start_time time not null,
  end_time time not null,
  constraint academy_group_schedules_time_order check (end_time > start_time)
);
-- business_id esta denormalizado del grupo padre (siempre igual a
-- academy_groups.business_id) a proposito -- CLAUDE.md exige business_id
-- en toda tabla de negocio, y evita una subquery/join en cada policy de
-- RLS. El service siempre lo escribe igual al de academy_groups; no hay
-- forma de que diverjan desde el frontend porque el insert lo arma el
-- codigo, no el usuario.

create table public.academy_enrollments (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.business (id),
  dependent_id uuid not null references public.dependents (id),
  group_id uuid not null references public.academy_groups (id),
  enrollment_date date not null default current_date,
  status text not null default 'ACTIVA' check (status in ('ACTIVA', 'BAJA')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
-- Un mismo Alumno no puede tener dos inscripciones ACTIVAS al mismo
-- grupo (si se da de baja y se re-inscribe despues, es una fila nueva).
create unique index academy_enrollments_active_unique
  on public.academy_enrollments (dependent_id, group_id)
  where status = 'ACTIVA';
```

Sin funciones RPC: a diferencia de `bookings` (que necesitaba verificar
cupo/crédito de forma atómica), aquí no hay ninguna invariante sensible a
condición de carrera — sin cupo máximo en este sub-proyecto, el `unique
index` ya evita inscripciones activas duplicadas. Escritura vía RLS
normal, mismo patrón que `dependents`/`instructors`/`packages`.

### RLS

Mismo patrón staff-scoped que `dependents` — sin catálogo público (a
diferencia de `instructors`/`studio_classes`, que son de lectura pública
por decisión explícita anterior, ver `docs/preguntas-para-negocio.md`
punto 7): este sub-proyecto es 100% admin, sin pantalla de cliente
todavía.

```sql
alter table public.academy_groups enable row level security;
create policy "academy_groups_manage_staff"
  on public.academy_groups for all
  using (
    public.current_user_role() = 'SUPER_ADMIN'
    or (business_id = public.current_user_business_id()
        and public.current_user_role() in ('STAFF', 'BUSINESS_ADMIN'))
  )
  with check (
    public.current_user_role() = 'SUPER_ADMIN'
    or (business_id = public.current_user_business_id()
        and public.current_user_role() in ('STAFF', 'BUSINESS_ADMIN'))
  );

alter table public.academy_group_schedules enable row level security;
create policy "academy_group_schedules_manage_staff"
  on public.academy_group_schedules for all
  using (
    public.current_user_role() = 'SUPER_ADMIN'
    or (business_id = public.current_user_business_id()
        and public.current_user_role() in ('STAFF', 'BUSINESS_ADMIN'))
  )
  with check (
    public.current_user_role() = 'SUPER_ADMIN'
    or (business_id = public.current_user_business_id()
        and public.current_user_role() in ('STAFF', 'BUSINESS_ADMIN'))
  );

alter table public.academy_enrollments enable row level security;
create policy "academy_enrollments_manage_staff"
  on public.academy_enrollments for all
  using (
    public.current_user_role() = 'SUPER_ADMIN'
    or (business_id = public.current_user_business_id()
        and public.current_user_role() in ('STAFF', 'BUSINESS_ADMIN'))
  )
  with check (
    public.current_user_role() = 'SUPER_ADMIN'
    or (business_id = public.current_user_business_id()
        and public.current_user_role() in ('STAFF', 'BUSINESS_ADMIN'))
  );
```

## Estructura de archivos (Feature-First, `apps/admin/src/features/`)

```
features/academy/
  types/AcademyGroup.ts
  types/AcademyGroupSchedule.ts
  types/AcademyEnrollment.ts
  services/academyGroupsService.ts
  services/academyEnrollmentsService.ts
  hooks/useAcademyGroups.ts
  hooks/useAcademyGroupEnrollments.ts
  components/AcademyGroupFormModal.tsx      (nombre + instructor + horarios repetibles)
  components/EnrollStudentModal.tsx         (cliente existente -> Alumno existente o nuevo + fecha)

pages/AcademyGroupsPage.tsx        (/academy/groups)
pages/AcademyGroupDetailPage.tsx   (/academy/groups/:id)
```

Modificados: `layouts/AdminLayout.tsx` (link "Academia"), `App.tsx`
(rutas nuevas), `HomePage.tsx` (botón "Academia" en el grid).

## Servicios

`academyGroupsService.ts`:
- `listGroups(): Promise<AcademyGroupWithSchedule[]>` — join con
  `academy_group_schedules` (embed de Supabase) e instructor
  (`instructors.full_name`), y conteo de inscritos activos.
- `createGroup(input): Promise<AcademyGroup>` — inserta el grupo y sus
  horarios en una sola llamada (insert del grupo, luego insert masivo de
  `academy_group_schedules` con el `id` devuelto — dos queries, no una
  transacción: si el segundo insert falla, el grupo queda sin horario y
  se puede editar después; no hay invariante que romper).
- `updateGroup(id, input): Promise<AcademyGroup>` — actualiza campos del
  grupo y reemplaza sus horarios (`delete` + `insert` de
  `academy_group_schedules` por `group_id`, patrón simple ya que un grupo
  nunca tiene más de un puñado de horarios).

`academyEnrollmentsService.ts`:
- `listEnrollmentsByGroup(groupId): Promise<EnrollmentWithStudent[]>` —
  solo `ACTIVA`, join a `dependents.full_name` y `dependents.guardian_id
  -> profiles.full_name` (para mostrar tutor).
- `enrollStudent(dependentId, groupId, enrollmentDate): Promise<AcademyEnrollment>`
  — insert normal.
- `withdrawEnrollment(id): Promise<void>` — `update ... set status =
  'BAJA', updated_at = now()`.

Manejo de errores: **usa `apps/admin/src/utils/getErrorMessage.ts`**
(ya existente, creado en el sub-proyecto de Reservaciones) en vez del
patrón `mapSaveError`/`err instanceof Error` de los formularios más
viejos (Instructores/Clases/Alumnos/Paquetes) — ese patrón tiene un bug
conocido y documentado (`docs/roadmap.md`, sección "Deuda técnica
conocida"): `err instanceof Error` nunca es `true` para un error real de
Supabase. No hay necesidad de distinguir RLS vs. constraint aquí (no hay
constraints de negocio complejos más allá del `unique index`), así que
un mensaje genérico + el mensaje real de Supabase cuando exista es
suficiente.

## UI / flujos

**`AcademyGroupsPage`** (`/academy/groups`): tabla de grupos (nombre,
instructor, resumen de horario tipo "Mar/Jue 17:00-18:00", # inscritos
activos, acciones). Botón "Nuevo grupo" abre `AcademyGroupFormModal`.

**`AcademyGroupFormModal`**: nombre (obligatorio), instructor (select
opcional sobre `useInstructors()`), lista repetible de horarios (día de
la semana + hora inicio + hora fin, botón "Agregar horario"/"Quitar",
mínimo 0 filas — un grupo puede crearse sin horario todavía y agregarse
después). `noValidate`, cierre con Escape, mismo patrón que
`ClassFormModal`.

**`AcademyGroupDetailPage`** (`/academy/groups/:id`): título del grupo +
horario. Tabla de Alumnos inscritos (nombre del Alumno, nombre del
tutor, fecha de inscripción, botón "Dar de baja" con `confirm()`). Botón
"Nuevo alumno" abre `EnrollStudentModal`.

**`EnrollStudentModal`**: selector de Cliente (`useCustomers()`, buscable
por nombre/teléfono) → al elegir uno, aparece un segundo selector de
Alumno de ese cliente (`useDependentsByGuardian(customerId)`, ya
existente) **o** un botón "Crear alumno nuevo" que revela el mismo
mini-formulario de `DependentFormModal` (nombre + fecha de nacimiento
opcional) inline, sin navegar fuera del modal — al guardar, el Alumno
nuevo queda seleccionado automáticamente. Campo de fecha de inscripción
(date input, default hoy). Botón "Inscribir".

## Validación

Zod en `AcademyGroupFormModal` (nombre obligatorio; cada horario:
`day_of_week` 0-6, `end_time` > `start_time`) y en el mini-formulario de
Alumno dentro de `EnrollStudentModal` (mismo schema que
`DependentFormModal` ya existente). `noValidate` en todos los `<form>`.

## Testing

Sin test runner en `apps/admin` (constante del proyecto). Checklist
manual:

1. Crear un grupo con nombre, instructor y 2 horarios (ej. Martes
   17:00-18:00, Jueves 17:00-18:00) → aparece en la lista con el resumen
   correcto.
2. Editar el grupo: cambiar instructor y quitar un horario → se refleja.
3. Desde el detalle del grupo, inscribir un Alumno existente → aparece
   en la tabla de inscritos con la fecha de hoy.
4. Inscribir al mismo Alumno otra vez al mismo grupo → rechazado
   (`unique index academy_enrollments_active_unique`).
5. Crear un Alumno nuevo inline desde `EnrollStudentModal` (cliente
   existente, alumno nuevo) → queda inscrito sin salir de la página.
6. Dar de baja a un Alumno inscrito → desaparece de la tabla de
   inscritos (sigue existiendo en `dependents`, solo cambia el `status`
   de su inscripción).
7. Re-inscribir a un Alumno dado de baja al mismo grupo → funciona (fila
   nueva, la anterior sigue en `BAJA`).
8. Un Alumno inscrito en dos grupos distintos a la vez → ambas
   inscripciones activas coexisten.
9. Escape cierra `AcademyGroupFormModal` y `EnrollStudentModal`.

## Fuera de alcance (queda para sub-proyectos futuros)

Vista de cliente en `apps/web`, clientes sin cuenta ("de mostrador"),
cupo máximo por grupo, colegiaturas/estado de pago — ver
`docs/roadmap.md` punto 18 para el orden completo.

> **Nota:** La funcionalidad de asistencia fue descartada por orden de la
> directora y no se implementará.
