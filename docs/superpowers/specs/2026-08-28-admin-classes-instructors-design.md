# Diseño: Clases + instructores en `apps/admin`

## Contexto

Primer sub-proyecto de la parte funcional del panel administrativo
(`apps/admin`). Hasta ahora `apps/admin` solo tiene login (Google OAuth +
gate de rol). El roadmap del negocio (Pilates studio) necesita que
staff/admin puedan gestionar el catálogo de instructores y clases antes
de que tenga sentido construir reservaciones, paquetes o el dashboard —
esas features dependen de que existan clases reales.

Es el primero de una serie de sub-proyectos del panel admin (orden
completo acordado con el usuario): clases+instructores → paquetes →
clientes → reservaciones+lista de espera → academia → pagos →
dashboard/notificaciones/settings. Este spec cubre solo el primero.

## Alcance

**Incluye:**
- CRUD de instructores (crear, editar, desactivar — nunca borrar).
- CRUD de clases del studio (crear, editar, cancelar — nunca borrar),
  como instancias individuales (fecha/hora puntual, sin recurrencia).
- Listados con filtros básicos en ambas pantallas.

**No incluye (decisiones explícitas del usuario para este sub-proyecto):**
- Horarios recurrentes / plantillas que generen instancias automáticas.
- Vista de calendario visual (queda para después, sobre la misma data).
- Cambios de esquema de base de datos — las tablas `instructors` y
  `studio_classes` (migraciones `003` y `004`) y sus RLS policies ya
  cubren lo que este sub-proyecto necesita, sin cambios.
- Reservaciones, paquetes, clientes, pagos, dashboard — sub-proyectos
  futuros separados.

## Modelo de datos (ya existente, sin migración)

`public.instructors`: `id`, `business_id`, `full_name`, `bio`,
`photo_url`, `active`, `created_at`, `updated_at`. RLS: lectura pública,
escritura solo `STAFF`/`BUSINESS_ADMIN`/`SUPER_ADMIN` del mismo
`business_id` (o cualquier `SUPER_ADMIN`).

`public.studio_classes`: `id`, `business_id`, `instructor_id` (FK a
`instructors`), `title`, `starts_at`, `ends_at`, `max_capacity`,
`status` (`SCHEDULED`/`CANCELLED`/`COMPLETED`), `created_at`,
`updated_at`. Constraint `ends_at > starts_at` y `max_capacity > 0` ya
existen a nivel DB. Mismo patrón de RLS que `instructors`.

Como ambas tablas ya tienen RLS que exige rol staff+ para escribir, el
frontend no necesita duplicar esa lógica de permisos — solo reflejarla
en la UI (ocultar botones si el rol no alcanza) como UX, sabiendo que la
seguridad real la sigue aplicando Postgres.

## Estructura de archivos (Feature-First, `apps/admin/src/features/`)

```
features/instructors/
  types/Instructor.ts
  services/instructorsService.ts
  hooks/useInstructors.ts
  components/InstructorsTable.tsx
  components/InstructorFormModal.tsx

features/classes/
  types/StudioClass.ts
  services/classesService.ts
  hooks/useClasses.ts
  components/ClassesTable.tsx
  components/ClassFormModal.tsx
  components/ClassFiltersBar.tsx

pages/InstructorsPage.tsx
pages/ClassesPage.tsx
```

Capas: `Page → Componente visual → hook → service → Supabase`, igual que
`features/auth`. Los componentes visuales nunca llaman a Supabase
directamente.

## Servicios (patrón throw-on-error, igual que `authService.ts`)

`instructorsService.ts`:
- `listInstructors(): Promise<Instructor[]>` — todos los del
  `business_id` del usuario actual, incluyendo inactivos (el admin
  necesita verlos para poder reactivarlos).
- `createInstructor(data): Promise<Instructor>`
- `updateInstructor(id, data): Promise<Instructor>`
- `setInstructorActive(id, active: boolean): Promise<void>`

`classesService.ts`:
- `listClasses(filters?: { instructorId?, status?, dateFrom?, dateTo? }): Promise<StudioClass[]>`
- `createClass(data): Promise<StudioClass>`
- `updateClass(id, data): Promise<StudioClass>`
- `cancelClass(id): Promise<void>` — hace `update` de `status` a
  `'CANCELLED'`, nunca `delete`.

## UI / flujos

**`InstructorsPage`** (`/instructors`): tabla con nombre, foto (o
placeholder), estado (activo/inactivo con badge), botón "Nuevo
instructor" que abre `InstructorFormModal`. Cada fila tiene "Editar" y
un toggle de activo/inactivo con confirmación inline (no modal aparte,
es una acción reversible y de bajo riesgo).

**`ClassesPage`** (`/classes`): tabla ordenada por `starts_at`
ascendente, columnas título/instructor/horario/capacidad/estado.
`ClassFiltersBar` arriba: selector de instructor, selector de estado,
rango de fechas (todos opcionales, sin filtro = todas las próximas).
Botón "Nueva clase" abre `ClassFormModal` con selector de instructor
(dropdown poblado desde `listInstructors`, solo activos), fecha/hora
inicio y fin, capacidad, y estado (default `SCHEDULED`). Acción
"Cancelar" en vez de "Eliminar" en cada fila con clase `SCHEDULED`.

## Validación

`zod` en ambos forms, reflejando los `check` constraints de la DB para
dar feedback antes del round-trip:
- Instructor: `full_name` no vacío.
- Clase: `title` no vacío, `instructor_id` requerido, `ends_at` >
  `starts_at`, `max_capacity` entero > 0.

Igual que `EmailPasswordForm`, los `<form>` usan `noValidate` para que
la validación nativa del navegador no bloquee el submit antes de que
corra la de `zod` (bug ya encontrado y corregido en esa feature).

## Manejo de errores

Los servicios lanzan el error de Supabase tal cual (throw-on-error,
mismo patrón que `authService`); los componentes lo capturan y muestran
un mensaje en español. Casos esperables:
- Violación de RLS (si el rol del usuario cambia a mitad de sesión, o
  intenta escribir fuera de su `business_id`) → "No tienes permiso para
  esta acción."
- Violación de constraint (`ends_at <= starts_at`, `max_capacity <= 0`)
  → no debería ocurrir si `zod` funciona, pero si Postgres la rechaza
  igual, mostrar "Revisa los datos del formulario" en vez de un mensaje
  crudo de Postgres.
- Error de red/desconocido → mensaje genérico, igual que el resto de la
  app.

## Testing

Sin tests automatizados nuevos en este sub-proyecto (el proyecto no
tiene suite de tests unitarios establecida todavía para `apps/admin`;
se sigue el patrón de verificación end-to-end en navegador real usado en
toda la etapa de Authentication). Verificación manual con la cuenta
`SUPER_ADMIN` ya probada:

1. Crear instructor → aparece en la tabla.
2. Crear clase referenciando ese instructor → aparece en la tabla,
   ordenada correctamente.
3. Editar la clase (cambiar horario) → se refleja.
4. Cancelar la clase → estado cambia a `CANCELLED`, sigue en la tabla
   (no desaparece).
5. Desactivar el instructor → sigue apareciendo en `InstructorsTable`
   como inactivo, pero no aparece como opción en el dropdown de
   `ClassFormModal` para clases nuevas.
6. Filtros de `ClassesPage` (por instructor, por estado, por rango de
   fechas) devuelven lo esperado.

## Fuera de alcance (queda para sub-proyectos futuros)

Recurrencia de horarios, calendario visual, reservaciones/lista de
espera, paquetes, clientes, pagos, dashboard, notificaciones, settings.
