# Academia — Clientes sin cuenta ("tutores de mostrador") Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permitir registrar alumnos e inscribirlos a grupos de Academia cuando sus tutores pagan en efectivo/mostrador y no tienen cuenta en Supabase Auth, relajando la obligatoriedad de `guardian_id` en la tabla `dependents` y almacenando el nombre y teléfono del tutor.

**Architecture:** Feature-First (`apps/admin/src/features/dependents/` y `apps/admin/src/features/academy/`), mismo patrón `Page → componente → hook → service → Supabase` que el resto del panel. Sin funciones RPC: RLS normal staff-scoped.

**Tech Stack:** React + Vite + TypeScript strict, Tailwind CSS v4, Supabase (Postgres + RLS + supabase-js tipado), Zod, React Router v6.

**Spec:** `docs/superpowers/specs/2026-08-31-academy-unregistered-guardians-design.md`

## Global Constraints

- `dependents.guardian_id` pasa a ser nullable. Si no tiene `guardian_id`, `guardian_name` es obligatorio.
- `"exactOptionalPropertyTypes": true` en `tsconfig.base.json` — tipado estructural y condicional.
- Todo `<form>` usa `noValidate`. Modales cierran con tecla Escape.
- Manejo de errores: usa `apps/admin/src/utils/getErrorMessage.ts`.
- No romper el flujo existente para tutores registrados con cuenta.

---

### Task 1: Migración de base de datos y regenerar tipos

**Files:**
- Create: `supabase/migrations/013_dependents_unregistered_guardians.sql`
- Modify: `apps/admin/src/lib/database.types.ts`
- Modify: `apps/web/src/lib/database.types.ts`

**Interfaces:**
- Produces: `dependents.guardian_id` (nullable), `dependents.guardian_name` (`text | null`), `dependents.guardian_phone` (`text | null`), constraint `dependents_guardian_check`.

- [ ] **Step 1: Crear el archivo de migración**

```sql
-- supabase/migrations/013_dependents_unregistered_guardians.sql
-- Permite registrar alumnos (dependents) cuyos tutores pagan en mostrador
-- y no tienen cuenta de usuario en Supabase Auth.

alter table public.dependents
  alter column guardian_id drop not null;

alter table public.dependents
  add column guardian_name text,
  add column guardian_phone text;

alter table public.dependents
  add constraint dependents_guardian_check
  check (
    (guardian_id is not null)
    or (guardian_name is not null and trim(guardian_name) <> '')
  );
```

- [ ] **Step 2: Aplicar la migración en el proyecto de Supabase**

Usa `apply_migration` o SQL Editor con `name: "013_dependents_unregistered_guardians"`.

- [ ] **Step 3: Regenerar tipos TypeScript**

Regenera `apps/admin/src/lib/database.types.ts` y `apps/web/src/lib/database.types.ts`.

- [ ] **Step 4: Typecheck**

Run: `npm run typecheck --workspace=apps/admin && npm run typecheck --workspace=apps/web`
Expected: sin errores.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/013_dependents_unregistered_guardians.sql apps/admin/src/lib/database.types.ts apps/web/src/lib/database.types.ts
git commit -m "feat(db): soporte para tutores de mostrador sin cuenta en dependents"
```

---

### Task 2: Actualizar capa de datos y servicios de dependientes e inscripciones

**Files:**
- Modify: `apps/admin/src/features/dependents/types/Dependent.ts`
- Modify: `apps/admin/src/features/dependents/services/dependentsService.ts`
- Modify: `apps/admin/src/features/academy/services/academyEnrollmentsService.ts`

**Interfaces:**
- Produces: `type Dependent` con `guardianId: string | null`, `guardianName: string | null`, `guardianPhone: string | null`.
- Produces: `createDependent(businessId, input: { fullName: string; birthDate?: string | null; guardianId?: string | null; guardianName?: string | null; guardianPhone?: string | null })`.
- Produces: `updateDependent(id, input: { fullName?: string; birthDate?: string | null; guardianName?: string | null; guardianPhone?: string | null })`.
- Produces: `listEnrollmentsByGroup` resolviendo `guardianName` desde `guardian_name` o `profiles.full_name`.

- [ ] **Step 1: Actualizar `features/dependents/types/Dependent.ts`**

```typescript
export type Dependent = {
  id: string;
  businessId: string;
  guardianId: string | null;
  guardianName: string | null;
  guardianPhone: string | null;
  fullName: string;
  birthDate: string | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
};

export type DependentWithGuardian = Dependent & {
  guardianName: string | null;
  guardianPhone: string | null;
};
```

- [ ] **Step 2: Actualizar `features/dependents/services/dependentsService.ts`**

Actualizar `toDependent`, `SELECT_COLUMNS`, `createDependent`, `updateDependent`, `listAllDependents` para incluir y mapear `guardian_name` y `guardian_phone`.

- [ ] **Step 3: Actualizar `features/academy/services/academyEnrollmentsService.ts`**

Actualizar el join a `dependents(full_name, guardian_name, profiles(full_name))` para resolver `guardianName = row.dependents?.guardian_name ?? row.dependents?.profiles?.full_name ?? null`.

- [ ] **Step 4: Typecheck**

Run: `npm run typecheck --workspace=apps/admin`
Expected: sin errores.

- [ ] **Step 5: Commit**

```bash
git add apps/admin/src/features/dependents/types apps/admin/src/features/dependents/services apps/admin/src/features/academy/services
git commit -m "feat(admin): soporte de tutores de mostrador en servicios de dependientes e inscripciones"
```

---

### Task 3: Actualizar `EnrollStudentModal.tsx` para soportar tutores de mostrador

**Files:**
- Modify: `apps/admin/src/features/academy/components/EnrollStudentModal.tsx`

**Interfaces:**
- Produces: Selector de modalidad en modal de inscripción: "Cliente con cuenta" vs "Tutor de mostrador (sin cuenta)".
- Produces: Creación de alumno de mostrador + inscripción directa en un solo click.

- [ ] **Step 1: Diseñar las pestañas/selector en `EnrollStudentModal.tsx`**

Pestañas de alternancia:
1. `Cliente registrado` (comportamiento actual).
2. `Tutor de mostrador` (inputs: Nombre tutor, Teléfono tutor, Nombre alumno, Fecha nacimiento, Fecha inscripción).

- [ ] **Step 2: Implementar la creación directa del alumno de mostrador e inscripción**

- [ ] **Step 3: Typecheck, lint y build**

Run: `npm run typecheck --workspace=apps/admin && npm run lint --workspace=apps/admin && npm run build --workspace=apps/admin`

- [ ] **Step 4: Commit**

```bash
git add apps/admin/src/features/academy/components/EnrollStudentModal.tsx
git commit -m "feat(admin): modal de inscripcion soporta tutores de mostrador"
```

---

### Task 4: Vista global `/students` y edición de dependientes

**Files:**
- Modify: `apps/admin/src/features/dependents/components/DependentFormModal.tsx`
- Modify: `apps/admin/src/features/dependents/components/DependentsTable.tsx`
- Modify: `apps/admin/src/pages/StudentsPage.tsx`

**Interfaces:**
- Produces: Botón "Nuevo alumno" en `/students` que abre `DependentFormModal` con campos para tutor de mostrador.
- Produces: Edición de nombre/teléfono de tutor en alumnos de mostrador.

- [ ] **Step 1: Actualizar `DependentFormModal.tsx`**

Permitir capturar/editar `guardianName` y `guardianPhone` si el alumno es de mostrador (`!guardianId`).

- [ ] **Step 2: Actualizar `DependentsTable.tsx`**

Mostrar tutor y teléfono en las columnas correspondientes.

- [ ] **Step 3: Actualizar `StudentsPage.tsx`**

Agregar botón "Nuevo alumno", estado para abrir el modal, y handler para crear.

- [ ] **Step 4: Typecheck, lint y build**

Run: `npm run typecheck --workspace=apps/admin && npm run lint --workspace=apps/admin && npm run build --workspace=apps/admin`

- [ ] **Step 5: Commit**

```bash
git add apps/admin/src/features/dependents apps/admin/src/pages/StudentsPage.tsx
git commit -m "feat(admin): gestion de alumnos de mostrador en pagina global de estudiantes"
```

---

### Task 5: Verificación end-to-end y documentación

**Files:**
- Modify: `docs/CURRENT_STATE.md`

**Interfaces:**
- Consumes: Todas las funcionalidades de las Tasks 1-4.

- [ ] **Step 1: Verificación manual end-to-end (Checklist del spec)**

1. En `/academy/groups/:id` → Inscribir tutor de mostrador → Alumno inscrito correctamente con nombre de tutor.
2. En `/academy/groups/:id` → Inscribir alumno de cliente registrado → Sigue funcionando.
3. En `/students` → Aparecen alumnos registrados y de mostrador.
4. En `/students` → "Nuevo alumno" → Crear alumno de mostrador → Aparece en la tabla.
5. En `/students` → Editar alumno de mostrador → Cambios persisten.
6. En `/customers/:id` → Solo aparecen alumnos del cliente específico.

- [ ] **Step 2: Actualizar `docs/CURRENT_STATE.md`**

Documentar migración 013, soporte de tutores de mostrador en Academia y directorio de alumnos, y actualizar el roadmap al sub-proyecto 18c (Colegiaturas).

- [ ] **Step 3: Commit**

```bash
git add docs/CURRENT_STATE.md
git commit -m "docs: clientes sin cuenta en academia completado, siguiente sub-proyecto colegiaturas"
```
