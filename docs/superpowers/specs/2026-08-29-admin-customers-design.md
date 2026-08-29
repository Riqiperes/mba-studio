# Diseño: Clientes + Alumnos en `apps/admin`

## Contexto

Tercer sub-proyecto del panel administrativo (orden acordado: clases+
instructores → paquetes → **clientes** → reservaciones+lista de espera →
academia → pagos → dashboard/notificaciones/settings). Ya existen
instructores, clases y paquetes en `apps/admin`. Este sub-proyecto agrega
el directorio de clientes y el concepto de "alumno" (dependiente de un
cliente, ej. un hijo/hija inscrito en Ballet mientras el titular de la
cuenta es quien paga).

Un cliente del negocio puede tener dos relaciones distintas con el
negocio, no excluyentes:
- Compra paquetes de créditos de Pilates para sí mismo (ya cubierto por
  el sub-proyecto de Paquetes — no requiere cambios aquí).
- Tiene uno o más Alumnos (ej. sus hijos) inscritos en clases de Ballet
  de la Academia. El Alumno es quien asiste, el cliente (titular de la
  cuenta) es quien paga y gestiona — el Alumno no tiene su propia cuenta
  de acceso.

## Alcance

**Incluye:**
- Directorio de clientes en `apps/admin`: listar y editar los perfiles
  existentes con rol `CUSTOMER` (ya existen vía `profiles`, no se crean
  clientes nuevos desde admin).
- CRUD de Alumnos (crear, editar, desactivar — nunca borrar) por cliente,
  vía una página de detalle por cliente.
- Vista global de Alumnos (todos los alumnos de todos los clientes en una
  sola tabla, con el nombre del cliente/tutor como referencia).
- Rediseño de `HomePage` (`/`, "Inicio") como panel de botones grandes
  hacia cada sección del admin (Instructores, Clases, Paquetes, Clientes,
  Alumnos), reemplazando el texto de bienvenida actual.

**No incluye (decisiones explícitas del usuario para este sub-proyecto):**
- Colegiaturas / pagos de Academia — sub-proyecto futuro de Pagos.
- Ver qué clientes están inscritos en cada clase de Pilates (roster de
  reservaciones) — necesita la tabla `bookings`, que no existe todavía;
  es el sub-proyecto de Reservaciones + Lista de Espera, el siguiente
  después de este. El cliente normal (fuera de alcance, futuro
  `apps/web`) solo verá el conteo de cupo por clase (ej. "8/12"); el
  admin, además, verá los nombres — ambas cosas se construyen ahí, no
  aquí.
- Auto-servicio en `apps/web` (que el cliente vea/edite su propio perfil
  o sus alumnos) — sub-proyecto futuro separado, cuando se construya esa
  parte de `apps/web`.
- Crear una cuenta de cliente manualmente desde admin (alta tipo
  recepción sin que la persona se haya registrado ella misma). Los
  clientes solo existen vía signup (Google/email) como hoy; admin
  únicamente ve/edita perfiles ya existentes.
- Mostrar el email del cliente en la UI de admin — vive en `auth.users`,
  no en `profiles`; exponerlo requeriría una vista o función nueva sobre
  el schema de Auth. Se deja fuera; si hace falta, se consulta desde el
  dashboard de Supabase directamente.

## Modelo de datos

`public.profiles` (ya existe, migración `002`, sin cambios): es la tabla
de clientes. RLS ya permite a `STAFF`/`BUSINESS_ADMIN`/`SUPER_ADMIN` leer
y editar perfiles de su `business_id` — no hace falta ninguna policy
nueva para el directorio de clientes.

**Tabla nueva `public.dependents`** (migración `010`, nombre de tabla y
columnas en inglés/lógica interna — la UI siempre dice "Alumno", nunca
"Dependiente"):

```sql
create table public.dependents (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.business (id),
  guardian_id uuid not null references public.profiles (id),
  full_name text not null,
  birth_date date,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index dependents_business_id_idx on public.dependents (business_id);
create index dependents_guardian_id_idx on public.dependents (guardian_id);

alter table public.dependents enable row level security;

create policy "dependents_manage_staff"
  on public.dependents
  for all
  using (
    public.current_user_role() = 'SUPER_ADMIN'
    or (
      business_id = public.current_user_business_id()
      and public.current_user_role() in ('STAFF', 'BUSINESS_ADMIN')
    )
  )
  with check (
    public.current_user_role() = 'SUPER_ADMIN'
    or (
      business_id = public.current_user_business_id()
      and public.current_user_role() in ('STAFF', 'BUSINESS_ADMIN')
    )
  );
```

Sin `policy` de lectura propia del cliente (`guardian_id = auth.uid()`)
todavía — se agrega cuando se construya el sub-proyecto de auto-servicio
en `apps/web`, no antes, para no dejar superficie de API abierta sin una
pantalla real que la use ni pruebas sobre ese camino.

`birth_date` es opcional (no se usa en este sub-proyecto — queda
disponible para cuando Academia necesite agrupar por edad).

## Estructura de archivos (Feature-First, `apps/admin/src/features/`)

```
features/customers/
  types/Customer.ts          (alias de tipo sobre Profile, solo lo que
                               el admin necesita: id, fullName, phone)
  services/customersService.ts
  hooks/useCustomers.ts

features/dependents/
  types/Dependent.ts          (tipo interno; la UI lo muestra como "Alumno")
  services/dependentsService.ts
  hooks/useDependents.ts
  hooks/useAllDependents.ts   (para la vista global)
  components/DependentsTable.tsx
  components/DependentFormModal.tsx

pages/CustomersPage.tsx       (/customers, tabla + link a detalle)
pages/CustomerDetailPage.tsx  (/customers/:id, datos + alumnos)
pages/StudentsPage.tsx        (/students, vista global de alumnos)
```

`HomePage.tsx` (ya existe) se reescribe, sin carpeta de feature nueva —
es solo navegación, no tiene datos propios.

Capas: `Page → Componente visual → hook → service → Supabase`, igual que
el resto del panel. Los componentes visuales nunca llaman a Supabase
directamente.

## Servicios

`customersService.ts`:
- `listCustomers(): Promise<Customer[]>` — perfiles con `role = 'CUSTOMER'`
  del `business_id` actual.
- `getCustomer(id): Promise<Customer>`
- `updateCustomer(id, { fullName?, phone? }): Promise<Customer>`

`dependentsService.ts`:
- `listDependentsByGuardian(guardianId): Promise<Dependent[]>` — usada en
  `CustomerDetailPage`, incluye inactivos (para poder reactivarlos).
- `listAllDependents(): Promise<Dependent[]>` — usada en `StudentsPage`,
  trae también `guardianId`/nombre del tutor via join o una segunda
  consulta liviana (decisión de implementación, no bloqueante para el
  diseño).
- `createDependent(businessId, guardianId, { fullName, birthDate? }): Promise<Dependent>`
- `updateDependent(id, { fullName?, birthDate? }): Promise<Dependent>`
- `setDependentActive(id, active: boolean): Promise<void>`

## UI / flujos

**`CustomersPage`** (`/customers`): tabla con nombre, teléfono, acción
"Ver". Sin conteo de alumnos en la tabla (se decidió que no vale el costo
de una query de conteo extra solo para un dato de conveniencia — se ve
en el detalle).

**`CustomerDetailPage`** (`/customers/:id`): datos del cliente (nombre,
teléfono — editables), sección "Alumnos" con `DependentsTable` (nombre,
fecha de nacimiento si existe, estado activo/inactivo, acciones editar/
desactivar) y botón "Nuevo alumno" que abre `DependentFormModal` (nombre
obligatorio, fecha de nacimiento opcional).

**`StudentsPage`** (`/students`, "Alumnos" en nav): tabla plana de todos
los alumnos del negocio, con una columna "Tutor" (nombre del cliente)
para dar contexto sin tener que entrar a cada cliente. Mismo componente
`DependentsTable` reutilizado, o una variante con la columna extra — a
decidir en implementación.

**`HomePage`** (`/`, "Inicio"): grid de botones/cards grandes, uno por
sección (Instructores, Clases, Paquetes, Clientes, Alumnos), cada uno
navega a su ruta. Reemplaza el saludo de texto actual.

**`AdminLayout`**: nav gana "Clientes" y "Alumnos".

## Validación

`zod` en `DependentFormModal`, mismo patrón que el resto: `fullName` no
vacío; `birthDate` opcional, si se ingresa debe ser una fecha válida no
futura (un alumno no puede nacer en el futuro). `noValidate` en el
`<form>`.

`CustomerDetailPage` (editar nombre/teléfono del cliente): `fullName` no
vacío si se edita; `phone` sin validación estricta de formato (mismo
criterio relajado que hoy en `profiles`, que no valida formato de
teléfono).

## Manejo de errores

Mismo patrón que instructores/clases/paquetes: servicios lanzan el error
de Supabase tal cual, componentes lo capturan y muestran mensaje en
español (RLS → "No tienes permiso para esta acción"; constraint →
"Revisa los datos del formulario"; resto → mensaje genérico). Sin toast,
mensajes inline.

## Testing

Sin test runner en `apps/admin` (constante del proyecto) — verificación
es `typecheck`/`lint`/`build` por tarea más verificación manual en
navegador real al cierre, igual que los sub-proyectos anteriores.
Checklist manual:

1. `/customers` lista los perfiles `CUSTOMER` existentes.
2. Entrar al detalle de un cliente, agregar un alumno → aparece en la
   tabla de ese cliente.
3. Editar el alumno (cambiar nombre) → se refleja.
4. Desactivar el alumno → sigue en la tabla como inactivo, reactivar
   funciona.
5. `/students` muestra ese alumno con el nombre del tutor correcto.
6. Editar nombre/teléfono del cliente desde `CustomerDetailPage` → se
   refleja en `/customers`.
7. `/` (Inicio) muestra los botones grandes, cada uno navega a su
   sección; nav de `AdminLayout` incluye "Clientes" y "Alumnos" con
   estado activo resaltado.

## Fuera de alcance (queda para sub-proyectos futuros)

Colegiaturas/pagos de Academia, roster de reservaciones por clase,
auto-servicio de clientes en `apps/web`, alta manual de clientes desde
admin, email de cliente en la UI de admin, reservaciones + lista de
espera, resto de Academia, pagos, dashboard/notificaciones/settings.
