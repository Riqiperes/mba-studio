# Diseño: Instructores como Admin Limitado (INSTRUCTOR_ADMIN)

## Contexto

Nuevo rol `INSTRUCTOR_ADMIN` para instructores que quieren ver sus clases
y alumnos asignados, sin acceso a gestion global (paquetes, creditos,
clientes de otros instructores, configuracion).

Segun `docs/business-rules.md`:
- Permisos: ver sus clases asignadas ("Mis clases"), ver alumnos de sus
  clases, **no** puede gestionar paquetes, creditos globales, clientes de
  otros instructores, ni configuracion global.
- Cuenta de instructor **recomendada** pero no obligatoria (puede no
  tener cuenta Auth y seguir asignado a clases).
- En admin: filtro por instructor para ver sus clientes/clases (staff
  ve todo, instructor ve solo lo suyo).

## Alcance

**Incluye:**
1. **Migracion:** agregar rol `INSTRUCTOR_ADMIN` al enum `user_role`.
   - Opcional: campo `instructor_id` en `profiles` para vincular cuenta
     Auth con instructor (si tiene cuenta).
2. **Auth/Roles:**
   - `RequireAuth` en admin: permitir `INSTRUCTOR_ADMIN` (ademas de
     STAFF/BUSINESS_ADMIN/SUPER_ADMIN).
   - Gate de navegacion: solo muestra items permitidos.
2. **Admin Layout/Navegacion para INSTRUCTOR_ADMIN:**
   - Solo: "Mis clases" (nueva pagina), "Perfil".
   - Ocultar: Instructores, Clases (CRUD global), Paquetes, Clientes,
     Alumnos, Academia, Creditos, Configuracion.
3. **Nueva pagina: "Mis clases" (`/instructor/my-classes`):**
   - Lista de clases donde `instructor_id = current_instructor_id`.
   - Para cada clase: titulo, horario, cupo, boton "Ver alumnos".
   - Click "Ver alumnos" -> lista de alumnos (reservados + waitlist) con
     condiciones medicas (alerta), edad, notas.
4. **Filtro por instructor en admin (para STAFF+):**
   - En `ClassesPage`, `ClassBookingsPage`, `CustomersPage`: selector
     "Instructor" que filtra.
   - Para `INSTRUCTOR_ADMIN`: filtro fijo a su propio ID (no editable).
5. **Vinculacion cuenta Auth <-> Instructor:**
   - Si instructor tiene cuenta: `profiles.instructor_id` = `instructors.id`.
   - Login -> detecta `instructor_id` -> redirige a `/instructor/my-classes`.
   - Si no tiene cuenta: staff gestiona sus clases normalmente.

**No incluye:**
- Permisos de editar/crear clases (solo lectura de sus propias).
- Gestion de paquetes, creditos, clientes globales.
- Notificaciones a instructores (sub-proyecto Notifications).

## Modelo de datos (Migracion)

```sql
-- 1. Agregar rol INSTRUCTOR_ADMIN
alter type public.user_role add value 'INSTRUCTOR_ADMIN';

-- 2. Vincular profile con instructor (opcional, para login)
alter table public.profiles
  add column instructor_id uuid references public.instructors (id);

-- 3. Indice para queries
create index profiles_instructor_id_idx on public.profiles (instructor_id);

-- 4. RLS para instructor_admin (ver solo sus clases/alumnos)
-- Policies nuevas en tablas relevantes (studio_classes, bookings, waitlist, dependents)
-- usando current_user_role() = 'INSTRUCTOR_ADMIN' y join a instructor_id

-- Ejemplo para studio_classes:
create policy "studio_classes_instructor_own_select"
  on public.studio_classes for select
  using (
    public.current_user_role() = 'INSTRUCTOR_ADMIN'
    and instructor_id = (
      select instructor_id from public.profiles where id = auth.uid()
    )
  );

-- Ejemplo para bookings (ver reservaciones de sus clases):
create policy "bookings_instructor_own_select"
  on public.bookings for select
  using (
    public.current_user_role() = 'INSTRUCTOR_ADMIN'
    and class_id in (
      select id from public.studio_classes
      where instructor_id = (
        select instructor_id from public.profiles where id = auth.uid()
      )
    )
  );

-- Similar para waitlist, dependents (via join a bookings/clases).
```

## Frontend - Admin

### `RequireAuth` actualizado

```tsx
const ADMIN_ROLES = ['STAFF', 'BUSINESS_ADMIN', 'SUPER_ADMIN', 'INSTRUCTOR_ADMIN'];

export function RequireAuth({ children }: { children: ReactNode }) {
  // ... existing logic ...
  if (profile && !ADMIN_ROLES.includes(profile.role)) {
    // Sin acceso
  }
  return children;
}
```

### `AdminLayout` — Navegacion condicional

```tsx
const navItems = useMemo(() => {
  const base = [
    { to: '/', label: 'Inicio', roles: ['STAFF', 'BUSINESS_ADMIN', 'SUPER_ADMIN', 'INSTRUCTOR_ADMIN'] },
    { to: '/instructor/my-classes', label: 'Mis clases', roles: ['INSTRUCTOR_ADMIN'] },
  ];
  
  const staffOnly = [
    { to: '/instructors', label: 'Instructores', roles: ['STAFF', 'BUSINESS_ADMIN', 'SUPER_ADMIN'] },
    { to: '/classes', label: 'Clases', roles: ['STAFF', 'BUSINESS_ADMIN', 'SUPER_ADMIN'] },
    { to: '/packages', label: 'Paquetes', roles: ['STAFF', 'BUSINESS_ADMIN', 'SUPER_ADMIN'] },
    { to: '/customers', label: 'Clientes', roles: ['STAFF', 'BUSINESS_ADMIN', 'SUPER_ADMIN'] },
    { to: '/students', label: 'Alumnos', roles: ['STAFF', 'BUSINESS_ADMIN', 'SUPER_ADMIN'] },
    { to: '/academy/groups', label: 'Academia', roles: ['STAFF', 'BUSINESS_ADMIN', 'SUPER_ADMIN'] },
    { to: '/academy/overdue', label: 'Colegiaturas', roles: ['STAFF', 'BUSINESS_ADMIN', 'SUPER_ADMIN'] },
  ];
  
  const role = profile?.role;
  return [...base, ...staffOnly].filter(item => item.roles.includes(role));
}, [profile?.role]);
```

### Nueva pagina: `InstructorMyClassesPage` (`/instructor/my-classes`)

```tsx
// Lista de clases del instructor actual
// Para cada clase: tarjeta con titulo, horario, cupo actual/max, boton "Ver alumnos"
// Click -> InstructorClassDetailModal/Page con lista de alumnos
// Alumnos: nombre, telefono tutor, condiciones medicas (alerta), edad, notas
// Estados: Reservado / Lista de espera
```

### `ClassBookingsPage` / `ClassesPage` / `CustomersPage` — Filtro instructor

```tsx
// Para STAFF/BUSINESS_ADMIN/SUPER_ADMIN: selector "Instructor" (todos + lista)
// Para INSTRUCTOR_ADMIN: filtro fijo a su instructor_id (hidden input)
const instructorId = profile.role === 'INSTRUCTOR_ADMIN' 
  ? profile.instructorId 
  : selectedInstructorId; // del estado/filtro
```

### Login redirect

```tsx
// En AuthProvider o LoginPage despues de login exitoso
if (profile.role === 'INSTRUCTOR_ADMIN') {
  navigate('/instructor/my-classes');
}
```

## Testing

Checklist manual:
1. Login como INSTRUCTOR_ADMIN -> redirige a `/instructor/my-classes`.
2. Nav muestra solo "Inicio", "Mis clases", "Perfil".
3. "Mis clases" lista solo clases donde `instructor_id = mio`.
4. Click "Ver alumnos" -> ve reservados + waitlist con alertas medicas.
5. No ve pestañas Clientes, Paquetes, Academia, etc.
6. Staff (STAFF) ve filtro "Instructor" en Clases/Reservaciones/Clientes.
7. Instructor sin cuenta Auth: staff gestiona sus clases normal (sin login).
8. RLS: instructor no puede hacer SELECT en clases de otro instructor.

## Fuera de alcance

- Instructor creando/editando sus clases (solo lectura).
- Notificaciones a instructor ("nueva reserva en tu clase").
- App movil dedicada para instructores.
- Dashboard de metricas del instructor (asistencia, ocupacion).