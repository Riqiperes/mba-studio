# Diseño: Actualizacion Grupos de Academia — Edad y Cupo Maximo (15)

## Contexto

Actualizacion de los grupos de Academia (migracion `012_academy_groups.sql`,
sub-proyecto 18a) para implementar:
- **Grupos por edad**: campos `age_min` / `age_max` (opcionales).
- **Capacidad maxima**: campo `max_capacity` (default 15, max 15, recomendado 12).
- Validaciones en formularios y RLS.

## Alcance

**Incluye:**
1. **Migracion:** agregar columnas en `academy_groups`:
   - `age_min` (smallint, nullable, check >= 0).
   - `age_max` (smallint, nullable, check >= age_min).
   - `max_capacity` (smallint, not null, default 15, check <= 15).
2. **Admin (`apps/admin`):**
   - `AcademyGroupFormModal`: nuevos campos con validacion Zod.
   - `AcademyGroupsPage` / `AcademyGroupDetailPage`: mostrar edad y cupo.
   - Validacion en inscripcion: alumno debe tener edad dentro de rango
     (si `age_min`/`age_max` definidos y alumno tiene `age`).
   - Validacion de cupo: no permitir mas inscripciones activas que
     `max_capacity`.
3. **Servicio (`academyGroupsService.ts` / `academyEnrollmentsService.ts`):**
   - `createGroup` / `updateGroup`: validar `age_min <= age_max`,
     `max_capacity <= 15`.
   - `enrollStudent`: verificar edad del alumno (via `dependents.age`)
     y cupo actual (`count(*) where status = 'ACTIVA'`).
3. **Web (`apps/web`):** no aplica (grupos solo admin por ahora).

**No incluye:**
- Lista de espera para grupos de academia (solo studio por ahora).
- Notificaciones de cupo lleno.
- Diferentes precios por grupo (coleiatura ya configurada por grupo).

## Modelo de datos (Migracion)

```sql
alter table public.academy_groups
  add column age_min smallint check (age_min >= 0),
  add column age_max smallint check (age_max >= 0 and age_max >= age_min),
  add column max_capacity smallint not null default 15 check (max_capacity <= 15);

-- Comentarios
comment on column public.academy_groups.age_min is 'Edad minima para inscribirse (opcional)';
comment on column public.academy_groups.age_max is 'Edad maxima para inscribirse (opcional)';
comment on column public.academy_groups.max_capacity is 'Cupo maximo de alumnos (max 15, recomendado 12)';
```

## Validaciones

### En `AcademyGroupFormModal` (Zod)

```typescript
const schema = z.object({
  name: z.string().min(1, 'Nombre obligatorio'),
  instructorId: z.string().optional().nullable(),
  schedules: z.array(scheduleSchema),
  ageMin: z.coerce.number().int().min(0).max(120).optional().nullable(),
  ageMax: z.coerce.number().int().min(0).max(120).optional().nullable(),
  maxCapacity: z.coerce.number().int().min(1).max(15).default(15),
}).refine((data) => {
  if (data.ageMin !== null && data.ageMax !== null) {
    return data.ageMax >= data.ageMin;
  }
  return true;
}, {
  message: 'Edad maxima debe ser mayor o igual a edad minima',
  path: ['ageMax'],
});
```

### En `enrollStudent` (servicio)

```typescript
async function enrollStudent(
  businessId: string,
  dependentId: string,
  groupId: string,
  enrollmentDate: string
): Promise<AcademyEnrollment> {
  // 1. Obtener grupo con age_min, age_max, max_capacity
  const group = await getGroupById(groupId);
  
  // 2. Obtener alumno (dependent) con age
  const dependent = await getDependentById(dependentId);
  
  // 3. Validar edad
  if (group.ageMin !== null && dependent.age !== null && dependent.age < group.ageMin) {
    throw new Error(`El alumno no cumple la edad minima (${group.ageMin} años)`);
  }
  if (group.ageMax !== null && dependent.age !== null && dependent.age > group.ageMax) {
    throw new Error(`El alumno excede la edad maxima (${group.ageMax} años)`);
  }
  
  // 4. Validar cupo
  const activeCount = await getActiveEnrollmentsCount(groupId);
  if (activeCount >= group.maxCapacity) {
    throw new Error(`El grupo ya tiene el cupo maximo (${group.maxCapacity} alumnos)`);
  }
  
  // 5. Insertar inscripcion
  return insertEnrollment(...);
}
```

## Frontend

### `AcademyGroupFormModal`

```tsx
// Campos existentes + nuevos
<div className="grid gap-4 sm:grid-cols-2">
  <div className="space-y-1">
    <label className="text-xs font-medium text-gray-700">Edad minima</label>
    <input type="number" min={0} max={120} ... />
  </div>
  <div className="space-y-1">
    <label className="text-xs font-medium text-gray-700">Edad maxima</label>
    <input type="number" min={0} max={120} ... />
  </div>
</div>
<div className="space-y-1">
  <label className="text-xs font-medium text-gray-700">Cupo maximo (max 15)</label>
  <input type="number" min={1} max={15} defaultValue={15} ... />
  <p className="text-xs text-gray-500">Recomendado: 12</p>
</div>
```

### `AcademyGroupDetailPage`

- Header muestra: "Edad: 6-12 años" (si definidos) | "Cupo: 8/15".
- En tabla de alumnos: badge "Edad: X" si alumno tiene edad.
- Boton "Inscribir alumno" deshabilitado si cupo lleno.

### `EnrollStudentModal` / `EnrollStudentModal` (existente)

- Al seleccionar alumno, validar edad vs grupo en frontend (UX) y
  backend (verdad).
- Mostrar error claro: "El alumno tiene 5 años, el grupo requiere minimo 6".

## Testing

Checklist manual:
1. Crear grupo sin edad ni cupo -> default max_capacity=15, sin restriccion edad.
2. Crear grupo edad 6-12, cupo 12 -> validaciones OK.
3. Crear grupo edad_min > edad_max -> error Zod "edad maxima >= minima".
4. Crear grupo cupo 16 -> error "max 15".
5. Inscribir alumno edad 5 en grupo 6-12 -> error "edad minima 6".
6. Inscribir alumno edad 13 en grupo 6-12 -> error "edad maxima 12".
7. Inscribir alumno sin edad en grupo con rango -> permitido (warning?).
8. Llenar cupo (12/12) -> siguiente inscripcion error "cupo maximo".
9. Editar grupo: reducir cupo por debajo de inscritos actuales -> error o warning.

## Fuera de alcance

- Lista de espera para academia (solo studio).
- Notificaciones automaticas cupo lleno.
- Precios diferenciados por grupo (usa colegiatura global).
- Grupos multi-nivel (un grupo = un nivel/edad).