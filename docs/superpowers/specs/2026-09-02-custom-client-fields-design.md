# Diseño: Campos Personalizados de Cliente (Condiciones Medicas, Edad, Notas)

## Contexto

Agregar campos opcionales en el perfil del cliente (`dependents` para
alumnos, `profiles` para titulares) para que instructores y staff
puedan ver informacion relevante:
- **Condiciones medicas**: embarazo, hernia, lesiones, cirugias recientes, etc.
- **Edad**: numero (para grupos por edad en Academia).
- **Notas adicionales**: texto libre para observaciones del instructor.

Visibles en: admin (detalle cliente), detalle de clase/reservacion,
lista de alumnos del instructor.

## Alcance

**Incluye:**
1. **Migracion:** agregar columnas en `dependents` (alumnos son quienes
   toman clases):
   - `medical_conditions` (text, nullable) — condiciones medicas.
   - `age` (integer, nullable) — edad actual.
   - `notes` (text, nullable) — notas libres del instructor/staff.
2. **Admin (`apps/admin`):**
   - `DependentFormModal`: agregar seccion "Informacion medica y notas"
     con los 3 campos.
   - `CustomerDetailPage` / `StudentsPage`: mostrar columnas/iconos.
   - `ClassBookingsPage` / `AcademyGroupDetailPage`: mostrar icono
     alerta si alumno tiene condiciones, tooltip/click para ver detalle.
3. **Instructor Admin (`apps/admin`):**
   - En vista "Mis clases" / lista de alumnos: mostrar icono de alerta
     y modal con condiciones medicas.
4. **Web (`apps/web`):** **NO visible** — informacion sensible, solo
   staff/instructores autorizados.

**No incluye:**
- Campos en `profiles` (titulares) — solo en `dependents` (alumnos).
- Validaciones medicas complejas — solo texto libre.
- Alertas automaticas — solo visibilidad.

## Modelo de datos (Migracion)

```sql
alter table public.dependents
  add column medical_conditions text,
  add column age integer check (age >= 0 and age <= 120),
  add column notes text;

-- Comentarios
comment on column public.dependents.medical_conditions is
  'Condiciones medicas relevantes para la practica (embarazo, hernia, lesiones, etc.)';
comment on column public.dependents.age is
  'Edad del alumno (para grupos por edad en Academia)';
comment on column public.dependents.notes is
  'Notas libres del instructor/staff sobre el alumno';
```

## Tipos y Servicios

### `apps/admin/src/features/dependents/types/Dependent.ts`

```typescript
export type Dependent = {
  // ... campos existentes
  medicalConditions: string | null;
  age: number | null;
  notes: string | null;
};

export type DependentWithGuardian = Dependent & {
  guardianName: string | null;
  guardianPhone: string | null;
  // Para uso en listas de clase
  hasMedicalAlert: boolean; // medicalConditions != null && trim != ''
};
```

### `apps/admin/src/features/dependents/services/dependentsService.ts`

- `createDependent`: incluir nuevos campos.
- `updateDependent`: permitir actualizar nuevos campos.
- `listAllDependents`: mapear `hasMedicalAlert`.

## Frontend Components

### `DependentFormModal.tsx` — Nueva seccion

```tsx
<fieldset className="space-y-4 pt-4 border-t border-gray-200">
  <legend className="text-sm font-medium text-gray-900">
    Informacion medica y notas (solo staff/instructores)
  </legend>
  
  <div className="space-y-1">
    <label className="block text-xs font-medium text-gray-700">
      Condiciones medicas
    </label>
    <textarea
      value={medicalConditions}
      onChange={...}
      rows={2}
      className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
      placeholder="Ej: Embarazo (semana 20), hernia lumbar L4-L5, cesarea reciente..."
    />
  </div>
  
  <div className="space-y-1">
    <label className="block text-xs font-medium text-gray-700">
      Edad
    </label>
    <input
      type="number"
      min={0}
      max={120}
      value={age ?? ''}
      onChange={...}
      className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
    />
  </div>
  
  <div className="space-y-1">
    <label className="block text-xs font-medium text-gray-700">
      Notas del instructor
    </label>
    <textarea
      value={notes}
      onChange={...}
      rows={2}
      className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
      placeholder="Observaciones sobre adaptaciones necesarias, limitaciones, etc."
    />
  </div>
</fieldset>
```

### `ClassBookingsPage` / `AcademyGroupDetailPage` — Alerta visual

```tsx
// En cada fila de alumno
{dependent.hasMedicalAlert && (
  <button
    type="button"
    onClick={() => setMedicalAlertOpen(true)}
    className="text-red-600 hover:underline text-sm"
    aria-label="Ver condiciones medicas"
  >
    ⚠️ Ver condiciones
  </button>
)}

// Modal con detalle
<MedicalAlertModal
  open={medicalAlertOpen}
  onClose={() => setMedicalAlertOpen(false)}
  conditions={dependent.medicalConditions}
  age={dependent.age}
  notes={dependent.notes}
/>
```

### `MedicalAlertModal.tsx` — Nuevo componente

```tsx
type Props = {
  open: boolean;
  onClose: () => void;
  conditions: string | null;
  age: number | null;
  notes: string | null;
  studentName: string;
};

export function MedicalAlertModal({ open, onClose, conditions, age, notes, studentName }: Props) {
  if (!open) return null;
  
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-lg bg-white p-6">
        <h2 className="mb-4 text-lg font-semibold text-brand-primary">
          Informacion medica: {studentName}
        </h2>
        
        {conditions && (
          <div className="mb-4 p-3 rounded-md bg-red-50 border border-red-200">
            <p className="text-sm font-medium text-red-800">Condiciones medicas:</p>
            <p className="mt-1 text-sm text-red-700 whitespace-pre-wrap">{conditions}</p>
          </div>
        )}
        
        {age !== null && (
          <div className="mb-4">
            <p className="text-sm font-medium text-gray-700">Edad: {age} años</p>
          </div>
        )}
        
        {notes && (
          <div className="mb-4">
            <p className="text-sm font-medium text-gray-700">Notas del instructor:</p>
            <p className="mt-1 text-sm text-gray-600 whitespace-pre-wrap">{notes}</p>
          </div>
        )}
        
        <div className="flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md bg-brand-primary px-4 py-2 text-sm font-medium text-white"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
```

## RLS

- Los nuevos campos heredan RLS de `dependents` (staff-scoped).
- Instructor Admin (`INSTRUCTOR_ADMIN`) ve solo sus alumnos (via join a clases asignadas).
- Cliente web **nunca** ve estos campos (no hay policy de lectura para CUSTOMER).

## Testing

Checklist manual:
1. Crear alumno con condicion "Embarazo semana 20" -> aparece alerta en lista de clase.
2. Click en alerta -> modal muestra detalle completo.
3. Editar alumno -> agregar edad 25, nota "Evitar flexion lumbar" -> se guarda.
4. Instructor Admin ve sus clases -> ve alertas de sus alumnos.
5. Cliente web **no ve** campos medicos en su perfil ni en reservas.
6. Busqueda/filtrado por "tiene alerta medica" en admin (futuro).

## Fuera de alcance

- Validaciones medicas estructuradas (checkboxes, categorias).
- Alertas automaticas ("alumno embarazada en clase de alto impacto").
- Compartir con cliente web (privacidad).
- Historial de cambios en condiciones medicas (auditoria).