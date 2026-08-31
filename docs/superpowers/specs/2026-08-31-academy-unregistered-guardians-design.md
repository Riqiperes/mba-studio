# Diseño: Academia — Clientes sin cuenta ("tutores de mostrador") en `apps/admin`

## Contexto

Sexto sub-proyecto del panel administrativo (orden acordado: clases+instructores
→ paquetes → clientes+alumnos → reservaciones+lista de espera → Academia
(grupos+inscripciones) → **Academia (clientes sin cuenta)** → Academia
(colegiaturas) → Academia (asistencia) → pagos →
dashboard/notificaciones/settings — ver `docs/roadmap.md` punto 18b).

En la operación real de una academia de ballet y danza, es muy común que padres
o tutores acudan directamente al mostrador a inscribir a sus hijos y pagar en
efectivo o transferencia, sin registrarse previamente en la plataforma web
(`apps/web`).

Hasta ahora, la tabla `dependents` exigía `guardian_id uuid not null references public.profiles(id)`
(y `profiles.id` con FK a `auth.users.id`). Esto impedía registrar alumnos cuyos
tutores no tuvieran cuenta de usuario activa en Supabase Auth. Este sub-proyecto
flexibiliza `dependents` para permitir alumnos asociados a tutores "de mostrador"
(guardando su nombre y teléfono de contacto para WhatsApp/avisos directamente en
la fila del alumno).

## Alcance

**Incluye:**
- Migración `013_dependents_unregistered_guardians.sql`:
  - `dependents.guardian_id` pasa a ser nullable (`DROP NOT NULL`).
  - Nuevas columnas `guardian_name text` y `guardian_phone text` en `dependents`.
  - Constraint `dependents_guardian_check`: exige que al menos exista `guardian_id`
    o `guardian_name` no vacío (`(guardian_id is not null) or (guardian_name is not null and trim(guardian_name) <> '')`).
- Actualización de tipos y servicios en `apps/admin/src/features/dependents/`:
  - `Dependent` y `DependentWithGuardian` actualizados con `guardianName` y `guardianPhone`.
  - `dependentsService.ts`: soporte para crear y actualizar alumnos con tutor de
    mostrador (`guardianId = null`, `guardianName`, `guardianPhone`).
  - `listAllDependents`: resuelve `guardianName` dando prioridad a `guardian_name`
    (tutor de mostrador) o `profiles.full_name` (tutor con cuenta).
- Actualización de `EnrollStudentModal.tsx` en `apps/admin/src/features/academy/`:
  - Selector de modo: **"Cliente registrado"** (flujo existente: tutor con cuenta
    → elegir alumno o crear alumno nuevo) vs. **"Tutor de mostrador (sin cuenta)"**
    (formulario: nombre del tutor, teléfono, nombre del alumno, fecha de
    nacimiento opcional).
  - Al inscribir con tutor de mostrador, crea el `dependent` y la `academy_enrollment`
    en un solo paso sin salir del modal.
- Actualización de `AcademyGroupDetailPage.tsx` y `academyEnrollmentsService.ts`:
  - Resuelve y muestra el nombre del tutor en la tabla de inscritos ya sea de cuenta
    registrada o de mostrador.
- Actualización de la vista global `/students` (`StudentsPage.tsx` / `DependentsTable.tsx` / `DependentFormModal.tsx`):
  - Botón "Nuevo alumno" en `/students` que permite registrar un alumno directamente
    (con tutor de mostrador o asignando tutor registrado).
  - `DependentFormModal`: permite capturar y editar los datos de contacto del tutor
    si el alumno es de mostrador.

**No incluye (decisiones explícitas de este sub-proyecto):**
- Cobro / registro de colegiaturas en efectivo — sub-proyecto siguiente (18c, ver `docs/roadmap.md`).
- Migración / reclamo de cuenta (cuando un tutor de mostrador posteriormente decide
  crear una cuenta en `apps/web` y vincular a sus alumnos) — documentado en roadmap
  como mejora futura.
- Clientes de mostrador en clases individuales de Studio (Pilates) — el Studio
  sigue usando `profiles` con créditos y reservaciones ligadas a `customer_id`.

## Modelo de datos (Migración `013`)

```sql
-- supabase/migrations/013_dependents_unregistered_guardians.sql

-- 1. Permitir guardian_id nulo para tutores que pagan en mostrador y no tienen cuenta Auth
alter table public.dependents
  alter column guardian_id drop not null;

-- 2. Columnas para datos de contacto del tutor de mostrador
alter table public.dependents
  add column guardian_name text,
  add column guardian_phone text;

-- 3. Constraint de integridad: un alumno debe tener tutor registrado o nombre de tutor capturado
alter table public.dependents
  add constraint dependents_guardian_check
  check (
    (guardian_id is not null)
    or (guardian_name is not null and trim(guardian_name) <> '')
  );
```

### RLS

No requiere nuevas políticas: las políticas de `dependents` creadas en `010_dependents.sql`
están basadas en `business_id = current_user_business_id()` y rol staff (`STAFF`, `BUSINESS_ADMIN`,
`SUPER_ADMIN`). Al ser `business_id` obligatorio en toda fila de `dependents`, el staff
puede gestionar alumnos con o sin `guardian_id` sin ningún cambio en RLS.

## Estructura de archivos y componentes

```
features/dependents/
  types/Dependent.ts                     (actualizado con guardianId nullable, guardianName, guardianPhone)
  services/dependentsService.ts          (createDependent actualizado para soportar tutor sin cuenta, listAllDependents actualizado)
  components/DependentFormModal.tsx      (campos condicionales de tutor de mostrador)
  components/DependentsTable.tsx         (columna tutor y teléfono formateado)

features/academy/
  components/EnrollStudentModal.tsx      (pestañas/selector: Cliente registrado vs Tutor de mostrador)
  services/academyEnrollmentsService.ts  (select con guardian_name en embed de dependents)

pages/
  StudentsPage.tsx                       (botón "Nuevo alumno" + modal)
  AcademyGroupDetailPage.tsx             (muestra tutor registrado o de mostrador)
```

## Validación

- Zod en `DependentFormModal` y `EnrollStudentModal`:
  - Si es tutor de mostrador: `guardianName` obligatorio (mínimo 1 caracter), `guardianPhone` opcional, `fullName` (alumno) obligatorio, `birthDate` opcional no futura.
  - Si es cliente registrado: `customerId` obligatorio, `dependentId` o datos de nuevo alumno obligatorios.
- `noValidate` en todos los `<form>`, cierre con tecla Escape.
- Manejo de errores con `getErrorMessage.ts`.

## Checklist de testing manual

1. En `/academy/groups/:id` → "Nuevo alumno" → pestaña "Tutor de mostrador" → llenar tutor "María López", teléfono "9991234567", alumno "Sofía López", fecha hoy → Inscribir → Alumno aparece en la lista con tutor "María López".
2. En `/academy/groups/:id` → inscribir alumno de cliente registrado existente → sigue funcionando idéntico.
3. En `/students` → aparece "Sofía López" con tutor "María López".
4. En `/students` → botón "Nuevo alumno" → crear alumno de mostrador → se lista en la tabla.
5. En `/students` → editar alumno de mostrador → cambiar nombre o teléfono de tutor → se guarda y refleja.
6. En `/customers/:id` → solo se muestran los alumnos pertenecientes a ese cliente con cuenta (`guardian_id = customer.id`), sin mezclar alumnos de mostrador.
7. Tecla Escape cierra todos los modales abiertos.
