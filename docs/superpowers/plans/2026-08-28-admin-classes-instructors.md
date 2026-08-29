# Clases + Instructores (apps/admin) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Dar a staff/admin un CRUD funcional de instructores y clases del studio dentro de `apps/admin`, primer sub-proyecto de la parte funcional del panel.

**Architecture:** Dos features nuevas (`features/instructors`, `features/classes`) siguiendo el patrón Feature-First existente (`Page → Componente → hook → service → Supabase`, igual que `features/auth`). Sin cambios de esquema: las tablas `instructors` y `studio_classes` (migraciones `003`/`004`) y su RLS ya cubren esto.

**Tech Stack:** React 19 + TypeScript strict + Tailwind v4 + react-router-dom v6 + zod + `@supabase/supabase-js` con el tipo `Database` generado (`apps/admin/src/lib/database.types.ts`).

**Spec:** `docs/superpowers/specs/2026-08-28-admin-classes-instructors-design.md`

## Global Constraints

- Los componentes visuales NUNCA llaman a Supabase directamente — siempre pasan por un `service` de la feature.
- `snake_case` en la DB, `camelCase` en los tipos de TS; el mapeo vive en el service (mismo patrón que `authService.ts`/`profile.ts`).
- Instructores y clases nunca se borran (hard delete) — instructores se desactivan (`active = false`), clases se cancelan (`status = 'CANCELLED'`).
- Todo `<form>` usa `noValidate` para que la validación nativa del navegador no bloquee el submit antes de que corra `zod` (bug ya encontrado en `EmailPasswordForm`).
- El proyecto no tiene test runner configurado en `apps/admin` (sin vitest/jest) — la verificación es `npm run typecheck` / `npm run lint` / `npm run build` por tarea, más verificación manual end-to-end en navegador real en la tarea final, igual que el resto de la etapa de Authentication.
- No hay cambios de base de datos en este plan.

---

### Task 1: Instructores — tipos y service

**Files:**
- Create: `apps/admin/src/features/instructors/types/Instructor.ts`
- Create: `apps/admin/src/features/instructors/services/instructorsService.ts`

**Interfaces:**
- Produces: `type Instructor = { id: string; businessId: string; fullName: string; bio: string | null; photoUrl: string | null; active: boolean; createdAt: string; updatedAt: string }`
- Produces: `listInstructors(): Promise<Instructor[]>`
- Produces: `createInstructor(businessId: string, input: { fullName: string; bio?: string | null; photoUrl?: string | null }): Promise<Instructor>`
- Produces: `updateInstructor(id: string, input: { fullName?: string; bio?: string | null; photoUrl?: string | null }): Promise<Instructor>`
- Produces: `setInstructorActive(id: string, active: boolean): Promise<void>`

- [ ] **Step 1: Crear el tipo `Instructor`**

```typescript
// apps/admin/src/features/instructors/types/Instructor.ts

/**
 * Forma en camelCase de una fila de `instructors` (ver
 * supabase/migrations/003_instructors.sql). El mapeo snake_case ->
 * camelCase vive en features/instructors/services/instructorsService.ts.
 */
export type Instructor = {
  id: string;
  businessId: string;
  fullName: string;
  bio: string | null;
  photoUrl: string | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
};
```

- [ ] **Step 2: Crear `instructorsService.ts`**

```typescript
// apps/admin/src/features/instructors/services/instructorsService.ts
import { supabase } from "@/lib/supabaseClient";
import type { Instructor } from "../types/Instructor";

const SELECT_COLUMNS =
  "id, business_id, full_name, bio, photo_url, active, created_at, updated_at";

type InstructorRow = {
  id: string;
  business_id: string;
  full_name: string;
  bio: string | null;
  photo_url: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
};

function toInstructor(row: InstructorRow): Instructor {
  return {
    id: row.id,
    businessId: row.business_id,
    fullName: row.full_name,
    bio: row.bio,
    photoUrl: row.photo_url,
    active: row.active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function listInstructors(): Promise<Instructor[]> {
  const { data, error } = await supabase
    .from("instructors")
    .select(SELECT_COLUMNS)
    .order("full_name", { ascending: true });

  if (error) throw error;
  return data.map(toInstructor);
}

export async function createInstructor(
  businessId: string,
  input: { fullName: string; bio?: string | null; photoUrl?: string | null },
): Promise<Instructor> {
  const { data, error } = await supabase
    .from("instructors")
    .insert({
      business_id: businessId,
      full_name: input.fullName,
      bio: input.bio ?? null,
      photo_url: input.photoUrl ?? null,
    })
    .select(SELECT_COLUMNS)
    .single();

  if (error) throw error;
  return toInstructor(data);
}

export async function updateInstructor(
  id: string,
  input: { fullName?: string; bio?: string | null; photoUrl?: string | null },
): Promise<Instructor> {
  const { data, error } = await supabase
    .from("instructors")
    .update({
      full_name: input.fullName,
      bio: input.bio,
      photo_url: input.photoUrl,
    })
    .eq("id", id)
    .select(SELECT_COLUMNS)
    .single();

  if (error) throw error;
  return toInstructor(data);
}

export async function setInstructorActive(id: string, active: boolean): Promise<void> {
  const { error } = await supabase.from("instructors").update({ active }).eq("id", id);
  if (error) throw error;
}
```

- [ ] **Step 3: Typecheck**

Run: `cd apps/admin && npm run typecheck`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add apps/admin/src/features/instructors/types/Instructor.ts apps/admin/src/features/instructors/services/instructorsService.ts
git commit -m "feat(admin): capa de datos de instructores"
```

---

### Task 2: Instructores — hook, UI y página

**Files:**
- Create: `apps/admin/src/features/instructors/hooks/useInstructors.ts`
- Create: `apps/admin/src/features/instructors/components/InstructorsTable.tsx`
- Create: `apps/admin/src/features/instructors/components/InstructorFormModal.tsx`
- Create: `apps/admin/src/pages/InstructorsPage.tsx`
- Modify: `apps/admin/src/App.tsx`

**Interfaces:**
- Consumes (Task 1): `Instructor`, `listInstructors`, `createInstructor`, `updateInstructor`, `setInstructorActive` from `@/features/instructors/services/instructorsService` and `@/features/instructors/types/Instructor`.
- Consumes: `useAuth()` from `@/features/auth/hooks/AuthProvider` (para `profile.businessId`).
- Produces: `useInstructors(): { instructors: Instructor[]; loading: boolean; error: string | null; reload: () => Promise<void>; create: (input: {fullName: string; bio?: string | null; photoUrl?: string | null}) => Promise<void>; update: (id: string, input: {fullName?: string; bio?: string | null; photoUrl?: string | null}) => Promise<void>; setActive: (id: string, active: boolean) => Promise<void> }`
- Produces: `<InstructorsTable instructors={Instructor[]} onEdit={(i: Instructor) => void} onToggleActive={(i: Instructor) => void} />`
- Produces: `<InstructorFormModal open={boolean} initialValue={Instructor | null} onClose={() => void} onSubmit={(input: {fullName: string; bio?: string | null; photoUrl?: string | null}) => Promise<void>} />`
- Produces: route `/instructors` renderizada dentro de `<RequireAuth>`.

- [ ] **Step 1: Crear `useInstructors`**

```typescript
// apps/admin/src/features/instructors/hooks/useInstructors.ts
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/features/auth/hooks/AuthProvider";
import {
  createInstructor,
  listInstructors,
  setInstructorActive,
  updateInstructor,
} from "../services/instructorsService";
import type { Instructor } from "../types/Instructor";

type InstructorInput = { fullName: string; bio?: string | null; photoUrl?: string | null };

export function useInstructors() {
  const { profile } = useAuth();
  const [instructors, setInstructors] = useState<Instructor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setInstructors(await listInstructors());
    } catch (err) {
      setError("No se pudieron cargar los instructores.");
      console.error("[instructors] listInstructors fallo", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  async function create(input: InstructorInput) {
    if (!profile) throw new Error("Falta el perfil del usuario actual.");
    await createInstructor(profile.businessId, input);
    await reload();
  }

  async function update(id: string, input: InstructorInput) {
    await updateInstructor(id, input);
    await reload();
  }

  async function setActive(id: string, active: boolean) {
    await setInstructorActive(id, active);
    await reload();
  }

  return { instructors, loading, error, reload, create, update, setActive };
}
```

- [ ] **Step 2: Crear `InstructorsTable`**

```tsx
// apps/admin/src/features/instructors/components/InstructorsTable.tsx
import type { Instructor } from "../types/Instructor";

type Props = {
  instructors: Instructor[];
  onEdit: (instructor: Instructor) => void;
  onToggleActive: (instructor: Instructor) => void;
};

export function InstructorsTable({ instructors, onEdit, onToggleActive }: Props) {
  if (instructors.length === 0) {
    return <p className="text-sm text-gray-500">Todavia no hay instructores.</p>;
  }

  return (
    <table id="instructors-table" className="w-full border-collapse text-sm">
      <thead>
        <tr className="border-b border-gray-200 text-left text-gray-500">
          <th className="py-2">Nombre</th>
          <th className="py-2">Estado</th>
          <th className="py-2">Acciones</th>
        </tr>
      </thead>
      <tbody>
        {instructors.map((instructor) => (
          <tr key={instructor.id} className="border-b border-gray-100">
            <td className="py-2">{instructor.fullName}</td>
            <td className="py-2">
              <span
                className={
                  instructor.active
                    ? "rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-700"
                    : "rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500"
                }
              >
                {instructor.active ? "Activo" : "Inactivo"}
              </span>
            </td>
            <td className="py-2">
              <button
                type="button"
                onClick={() => onEdit(instructor)}
                className="mr-3 text-brand-primary hover:underline"
              >
                Editar
              </button>
              <button
                type="button"
                onClick={() => onToggleActive(instructor)}
                className="text-gray-600 hover:underline"
              >
                {instructor.active ? "Desactivar" : "Activar"}
              </button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
```

- [ ] **Step 3: Crear `InstructorFormModal`**

```tsx
// apps/admin/src/features/instructors/components/InstructorFormModal.tsx
import { useEffect, useState, type FormEvent } from "react";
import { z } from "zod";
import type { Instructor } from "../types/Instructor";

const schema = z.object({
  fullName: z.string().min(1, "El nombre es obligatorio"),
  bio: z.string().optional(),
  photoUrl: z.string().url("URL invalida").optional().or(z.literal("")),
});

type InstructorInput = { fullName: string; bio?: string | null; photoUrl?: string | null };

type Props = {
  open: boolean;
  initialValue: Instructor | null;
  onClose: () => void;
  onSubmit: (input: InstructorInput) => Promise<void>;
};

// Distingue el motivo real del rechazo (RLS vs constraint vs desconocido)
// en vez de un mensaje generico, igual que mapAuthError en apps/web.
function mapSaveError(err: unknown): string {
  const message = err instanceof Error ? err.message : "";
  if (message.includes("row-level security") || message.includes("42501")) {
    return "No tienes permiso para esta accion.";
  }
  if (message.includes("violates check constraint") || message.includes("violates not-null constraint")) {
    return "Revisa los datos del formulario.";
  }
  return "No se pudo guardar. Intenta de nuevo.";
}

export function InstructorFormModal({ open, initialValue, onClose, onSubmit }: Props) {
  const [fullName, setFullName] = useState("");
  const [bio, setBio] = useState("");
  const [photoUrl, setPhotoUrl] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setFullName(initialValue?.fullName ?? "");
    setBio(initialValue?.bio ?? "");
    setPhotoUrl(initialValue?.photoUrl ?? "");
    setFieldErrors({});
    setFormError(null);
  }, [open, initialValue]);

  if (!open) return null;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);

    const result = schema.safeParse({ fullName, bio, photoUrl });
    if (!result.success) {
      const errors: Record<string, string> = {};
      for (const issue of result.error.issues) {
        errors[String(issue.path[0])] = issue.message;
      }
      setFieldErrors(errors);
      return;
    }
    setFieldErrors({});

    setIsSaving(true);
    try {
      await onSubmit({
        fullName,
        bio: bio || null,
        photoUrl: photoUrl || null,
      });
      onClose();
    } catch (err) {
      setFormError(mapSaveError(err));
      console.error("[instructors] guardar fallo", err);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/40 p-4">
      <form
        id="instructor-form-modal"
        onSubmit={handleSubmit}
        noValidate
        className="flex w-full max-w-sm flex-col gap-3 rounded-lg bg-white p-6"
      >
        <h2 className="text-lg font-semibold text-brand-primary">
          {initialValue ? "Editar instructor" : "Nuevo instructor"}
        </h2>

        <div className="flex flex-col gap-1">
          <input
            id="instructor-fullname-input"
            type="text"
            placeholder="Nombre completo"
            value={fullName}
            onChange={(event) => setFullName(event.target.value)}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
          {fieldErrors.fullName && <p className="text-xs text-red-600">{fieldErrors.fullName}</p>}
        </div>

        <div className="flex flex-col gap-1">
          <textarea
            id="instructor-bio-input"
            placeholder="Bio (opcional)"
            value={bio}
            onChange={(event) => setBio(event.target.value)}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
        </div>

        <div className="flex flex-col gap-1">
          <input
            id="instructor-photo-input"
            type="text"
            placeholder="URL de foto (opcional)"
            value={photoUrl}
            onChange={(event) => setPhotoUrl(event.target.value)}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
          {fieldErrors.photoUrl && <p className="text-xs text-red-600">{fieldErrors.photoUrl}</p>}
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-gray-600">
            Cancelar
          </button>
          <button
            type="submit"
            disabled={isSaving}
            className="rounded-md bg-brand-primary px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
          >
            {isSaving ? "Guardando..." : "Guardar"}
          </button>
        </div>

        {formError && <p className="text-sm text-red-600">{formError}</p>}
      </form>
    </div>
  );
}
```

- [ ] **Step 4: Crear `InstructorsPage`**

```tsx
// apps/admin/src/pages/InstructorsPage.tsx
import { useState } from "react";
import { InstructorFormModal } from "@/features/instructors/components/InstructorFormModal";
import { InstructorsTable } from "@/features/instructors/components/InstructorsTable";
import { useInstructors } from "@/features/instructors/hooks/useInstructors";
import type { Instructor } from "@/features/instructors/types/Instructor";

export function InstructorsPage() {
  const { instructors, loading, error, create, update, setActive } = useInstructors();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Instructor | null>(null);

  function openCreate() {
    setEditing(null);
    setModalOpen(true);
  }

  function openEdit(instructor: Instructor) {
    setEditing(instructor);
    setModalOpen(true);
  }

  async function handleSubmit(input: { fullName: string; bio?: string | null; photoUrl?: string | null }) {
    if (editing) {
      await update(editing.id, input);
    } else {
      await create(input);
    }
  }

  return (
    <div id="instructors-page" className="mx-auto max-w-3xl p-6">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-brand-primary">Instructores</h1>
        <button
          type="button"
          onClick={openCreate}
          className="rounded-md bg-brand-primary px-4 py-2 text-sm font-medium text-white hover:opacity-90"
        >
          Nuevo instructor
        </button>
      </div>

      {loading && <p className="text-sm text-gray-500">Cargando...</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}
      {!loading && !error && (
        <InstructorsTable
          instructors={instructors}
          onEdit={openEdit}
          onToggleActive={(instructor) => setActive(instructor.id, !instructor.active)}
        />
      )}

      <InstructorFormModal
        open={modalOpen}
        initialValue={editing}
        onClose={() => setModalOpen(false)}
        onSubmit={handleSubmit}
      />
    </div>
  );
}
```

- [ ] **Step 5: Agregar la ruta en `App.tsx`**

```tsx
// apps/admin/src/App.tsx
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { AuthProvider } from "@/features/auth/hooks/AuthProvider";
import { RequireAuth } from "@/routes/RequireAuth";
import { LoginPage } from "@/pages/LoginPage";
import { HomePage } from "@/pages/HomePage";
import { InstructorsPage } from "@/pages/InstructorsPage";

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route
            path="/"
            element={
              <RequireAuth>
                <HomePage />
              </RequireAuth>
            }
          />
          <Route
            path="/instructors"
            element={
              <RequireAuth>
                <InstructorsPage />
              </RequireAuth>
            }
          />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
```

- [ ] **Step 6: Typecheck, lint, build**

Run: `cd apps/admin && npm run typecheck && npm run lint && npm run build`
Expected: sin errores.

- [ ] **Step 7: Verificación manual en navegador**

Con `npm run dev:admin` corriendo y sesión iniciada como `SUPER_ADMIN`, navega a `/instructors`: crea un instructor, edítalo, desactívalo y vuelve a activarlo. Confirma que la tabla se actualiza sin recargar la página.

- [ ] **Step 8: Commit**

```bash
git add apps/admin/src/features/instructors/hooks/useInstructors.ts apps/admin/src/features/instructors/components/InstructorsTable.tsx apps/admin/src/features/instructors/components/InstructorFormModal.tsx apps/admin/src/pages/InstructorsPage.tsx apps/admin/src/App.tsx
git commit -m "feat(admin): CRUD de instructores"
```

---

### Task 3: Clases — tipos y service

**Files:**
- Create: `apps/admin/src/features/classes/types/StudioClass.ts`
- Create: `apps/admin/src/features/classes/services/classesService.ts`

**Interfaces:**
- Produces: `type StudioClassStatus = "SCHEDULED" | "CANCELLED" | "COMPLETED"`
- Produces: `type StudioClass = { id: string; businessId: string; instructorId: string; title: string; startsAt: string; endsAt: string; maxCapacity: number; status: StudioClassStatus; createdAt: string; updatedAt: string }`
- Produces: `type ClassFilters = { instructorId?: string; status?: StudioClassStatus; dateFrom?: string; dateTo?: string }`
- Produces: `listClasses(filters?: ClassFilters): Promise<StudioClass[]>`
- Produces: `createClass(businessId: string, input: { instructorId: string; title: string; startsAt: string; endsAt: string; maxCapacity: number }): Promise<StudioClass>`
- Produces: `updateClass(id: string, input: { instructorId?: string; title?: string; startsAt?: string; endsAt?: string; maxCapacity?: number }): Promise<StudioClass>`
- Produces: `cancelClass(id: string): Promise<void>`

- [ ] **Step 1: Crear el tipo `StudioClass`**

```typescript
// apps/admin/src/features/classes/types/StudioClass.ts

/**
 * Forma en camelCase de una fila de `studio_classes` (ver
 * supabase/migrations/004_studio_classes.sql). El mapeo snake_case ->
 * camelCase vive en features/classes/services/classesService.ts.
 */
export type StudioClassStatus = "SCHEDULED" | "CANCELLED" | "COMPLETED";

export type StudioClass = {
  id: string;
  businessId: string;
  instructorId: string;
  title: string;
  startsAt: string;
  endsAt: string;
  maxCapacity: number;
  status: StudioClassStatus;
  createdAt: string;
  updatedAt: string;
};

export type ClassFilters = {
  instructorId?: string;
  status?: StudioClassStatus;
  dateFrom?: string;
  dateTo?: string;
};
```

- [ ] **Step 2: Crear `classesService.ts`**

```typescript
// apps/admin/src/features/classes/services/classesService.ts
import { supabase } from "@/lib/supabaseClient";
import type { ClassFilters, StudioClass } from "../types/StudioClass";

const SELECT_COLUMNS =
  "id, business_id, instructor_id, title, starts_at, ends_at, max_capacity, status, created_at, updated_at";

type StudioClassRow = {
  id: string;
  business_id: string;
  instructor_id: string;
  title: string;
  starts_at: string;
  ends_at: string;
  max_capacity: number;
  status: StudioClass["status"];
  created_at: string;
  updated_at: string;
};

function toStudioClass(row: StudioClassRow): StudioClass {
  return {
    id: row.id,
    businessId: row.business_id,
    instructorId: row.instructor_id,
    title: row.title,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    maxCapacity: row.max_capacity,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function listClasses(filters: ClassFilters = {}): Promise<StudioClass[]> {
  let query = supabase.from("studio_classes").select(SELECT_COLUMNS);

  if (filters.instructorId) query = query.eq("instructor_id", filters.instructorId);
  if (filters.status) query = query.eq("status", filters.status);
  if (filters.dateFrom) query = query.gte("starts_at", filters.dateFrom);
  if (filters.dateTo) query = query.lte("starts_at", filters.dateTo);

  const { data, error } = await query.order("starts_at", { ascending: true });

  if (error) throw error;
  return data.map(toStudioClass);
}

export async function createClass(
  businessId: string,
  input: { instructorId: string; title: string; startsAt: string; endsAt: string; maxCapacity: number },
): Promise<StudioClass> {
  const { data, error } = await supabase
    .from("studio_classes")
    .insert({
      business_id: businessId,
      instructor_id: input.instructorId,
      title: input.title,
      starts_at: input.startsAt,
      ends_at: input.endsAt,
      max_capacity: input.maxCapacity,
    })
    .select(SELECT_COLUMNS)
    .single();

  if (error) throw error;
  return toStudioClass(data);
}

export async function updateClass(
  id: string,
  input: {
    instructorId?: string;
    title?: string;
    startsAt?: string;
    endsAt?: string;
    maxCapacity?: number;
  },
): Promise<StudioClass> {
  const { data, error } = await supabase
    .from("studio_classes")
    .update({
      instructor_id: input.instructorId,
      title: input.title,
      starts_at: input.startsAt,
      ends_at: input.endsAt,
      max_capacity: input.maxCapacity,
    })
    .eq("id", id)
    .select(SELECT_COLUMNS)
    .single();

  if (error) throw error;
  return toStudioClass(data);
}

export async function cancelClass(id: string): Promise<void> {
  const { error } = await supabase
    .from("studio_classes")
    .update({ status: "CANCELLED" })
    .eq("id", id);

  if (error) throw error;
}
```

- [ ] **Step 3: Typecheck**

Run: `cd apps/admin && npm run typecheck`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add apps/admin/src/features/classes/types/StudioClass.ts apps/admin/src/features/classes/services/classesService.ts
git commit -m "feat(admin): capa de datos de clases"
```

---

### Task 4: Clases — hook, UI y página

**Files:**
- Create: `apps/admin/src/features/classes/hooks/useClasses.ts`
- Create: `apps/admin/src/features/classes/components/ClassFiltersBar.tsx`
- Create: `apps/admin/src/features/classes/components/ClassesTable.tsx`
- Create: `apps/admin/src/features/classes/components/ClassFormModal.tsx`
- Create: `apps/admin/src/pages/ClassesPage.tsx`
- Modify: `apps/admin/src/App.tsx`

**Interfaces:**
- Consumes (Task 3): `StudioClass`, `StudioClassStatus`, `ClassFilters`, `listClasses`, `createClass`, `updateClass`, `cancelClass` from `@/features/classes/services/classesService` y `@/features/classes/types/StudioClass`.
- Consumes (Task 1/2): `Instructor`, `useInstructors` (para poblar el selector de instructor con los activos).
- Produces: `useClasses(filters: ClassFilters): { classes: StudioClass[]; loading: boolean; error: string | null; reload: () => Promise<void>; create: (input: {instructorId: string; title: string; startsAt: string; endsAt: string; maxCapacity: number}) => Promise<void>; update: (id: string, input: {...}) => Promise<void>; cancel: (id: string) => Promise<void> }`
- Produces: `<ClassFiltersBar instructors={Instructor[]} filters={ClassFilters} onChange={(next: ClassFilters) => void} />`
- Produces: `<ClassesTable classes={StudioClass[]} instructors={Instructor[]} onEdit={(c: StudioClass) => void} onCancel={(c: StudioClass) => void} />`
- Produces: `<ClassFormModal open={boolean} initialValue={StudioClass | null} instructors={Instructor[]} onClose={() => void} onSubmit={(input) => Promise<void>} />`
- Produces: route `/classes` dentro de `<RequireAuth>`.

- [ ] **Step 1: Crear `useClasses`**

```typescript
// apps/admin/src/features/classes/hooks/useClasses.ts
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/features/auth/hooks/AuthProvider";
import { cancelClass, createClass, listClasses, updateClass } from "../services/classesService";
import type { ClassFilters, StudioClass } from "../types/StudioClass";

type ClassInput = {
  instructorId: string;
  title: string;
  startsAt: string;
  endsAt: string;
  maxCapacity: number;
};

export function useClasses(filters: ClassFilters) {
  const { profile } = useAuth();
  const [classes, setClasses] = useState<StudioClass[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setClasses(await listClasses(filters));
    } catch (err) {
      setError("No se pudieron cargar las clases.");
      console.error("[classes] listClasses fallo", err);
    } finally {
      setLoading(false);
    }
    // Solo dependemos de campos primitivos individuales de `filters` (no
    // del objeto en si) para no disparar recargas por una referencia
    // nueva de objeto en cada render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.instructorId, filters.status, filters.dateFrom, filters.dateTo]);

  useEffect(() => {
    reload();
  }, [reload]);

  async function create(input: ClassInput) {
    if (!profile) throw new Error("Falta el perfil del usuario actual.");
    await createClass(profile.businessId, input);
    await reload();
  }

  async function update(id: string, input: Partial<ClassInput>) {
    await updateClass(id, input);
    await reload();
  }

  async function cancel(id: string) {
    await cancelClass(id);
    await reload();
  }

  return { classes, loading, error, reload, create, update, cancel };
}
```

- [ ] **Step 2: Crear `ClassFiltersBar`**

```tsx
// apps/admin/src/features/classes/components/ClassFiltersBar.tsx
import type { Instructor } from "@/features/instructors/types/Instructor";
import type { ClassFilters, StudioClassStatus } from "../types/StudioClass";

const STATUS_OPTIONS: StudioClassStatus[] = ["SCHEDULED", "CANCELLED", "COMPLETED"];

type Props = {
  instructors: Instructor[];
  filters: ClassFilters;
  onChange: (next: ClassFilters) => void;
};

export function ClassFiltersBar({ instructors, filters, onChange }: Props) {
  return (
    <div id="class-filters-bar" className="mb-4 flex flex-wrap gap-2">
      <select
        id="class-filter-instructor"
        value={filters.instructorId ?? ""}
        onChange={(event) =>
          onChange({ ...filters, instructorId: event.target.value || undefined })
        }
        className="rounded-md border border-gray-300 px-2 py-1 text-sm"
      >
        <option value="">Todos los instructores</option>
        {instructors.map((instructor) => (
          <option key={instructor.id} value={instructor.id}>
            {instructor.fullName}
          </option>
        ))}
      </select>

      <select
        id="class-filter-status"
        value={filters.status ?? ""}
        onChange={(event) =>
          onChange({
            ...filters,
            status: (event.target.value || undefined) as StudioClassStatus | undefined,
          })
        }
        className="rounded-md border border-gray-300 px-2 py-1 text-sm"
      >
        <option value="">Todos los estados</option>
        {STATUS_OPTIONS.map((status) => (
          <option key={status} value={status}>
            {status}
          </option>
        ))}
      </select>

      <input
        id="class-filter-date-from"
        type="date"
        value={filters.dateFrom ?? ""}
        onChange={(event) => onChange({ ...filters, dateFrom: event.target.value || undefined })}
        className="rounded-md border border-gray-300 px-2 py-1 text-sm"
      />
      <input
        id="class-filter-date-to"
        type="date"
        value={filters.dateTo ?? ""}
        onChange={(event) => onChange({ ...filters, dateTo: event.target.value || undefined })}
        className="rounded-md border border-gray-300 px-2 py-1 text-sm"
      />
    </div>
  );
}
```

- [ ] **Step 3: Crear `ClassesTable`**

```tsx
// apps/admin/src/features/classes/components/ClassesTable.tsx
import type { Instructor } from "@/features/instructors/types/Instructor";
import type { StudioClass } from "../types/StudioClass";

type Props = {
  classes: StudioClass[];
  instructors: Instructor[];
  onEdit: (studioClass: StudioClass) => void;
  onCancel: (studioClass: StudioClass) => void;
};

export function ClassesTable({ classes, instructors, onEdit, onCancel }: Props) {
  if (classes.length === 0) {
    return <p className="text-sm text-gray-500">No hay clases con estos filtros.</p>;
  }

  function instructorName(instructorId: string): string {
    return instructors.find((i) => i.id === instructorId)?.fullName ?? "—";
  }

  return (
    <table id="classes-table" className="w-full border-collapse text-sm">
      <thead>
        <tr className="border-b border-gray-200 text-left text-gray-500">
          <th className="py-2">Titulo</th>
          <th className="py-2">Instructor</th>
          <th className="py-2">Horario</th>
          <th className="py-2">Cupo</th>
          <th className="py-2">Estado</th>
          <th className="py-2">Acciones</th>
        </tr>
      </thead>
      <tbody>
        {classes.map((studioClass) => (
          <tr key={studioClass.id} className="border-b border-gray-100">
            <td className="py-2">{studioClass.title}</td>
            <td className="py-2">{instructorName(studioClass.instructorId)}</td>
            <td className="py-2">
              {new Date(studioClass.startsAt).toLocaleString()} –{" "}
              {new Date(studioClass.endsAt).toLocaleTimeString()}
            </td>
            <td className="py-2">{studioClass.maxCapacity}</td>
            <td className="py-2">{studioClass.status}</td>
            <td className="py-2">
              <button
                type="button"
                onClick={() => onEdit(studioClass)}
                className="mr-3 text-brand-primary hover:underline"
              >
                Editar
              </button>
              {studioClass.status === "SCHEDULED" && (
                <button
                  type="button"
                  onClick={() => onCancel(studioClass)}
                  className="text-red-600 hover:underline"
                >
                  Cancelar
                </button>
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
```

- [ ] **Step 4: Crear `ClassFormModal`**

```tsx
// apps/admin/src/features/classes/components/ClassFormModal.tsx
import { useEffect, useState, type FormEvent } from "react";
import { z } from "zod";
import type { Instructor } from "@/features/instructors/types/Instructor";
import type { StudioClass } from "../types/StudioClass";

const schema = z
  .object({
    title: z.string().min(1, "El titulo es obligatorio"),
    instructorId: z.string().min(1, "Elige un instructor"),
    startsAt: z.string().min(1, "La fecha/hora de inicio es obligatoria"),
    endsAt: z.string().min(1, "La fecha/hora de fin es obligatoria"),
    maxCapacity: z.coerce.number().int().positive("El cupo debe ser mayor a 0"),
  })
  .refine((value) => new Date(value.endsAt) > new Date(value.startsAt), {
    message: "La hora de fin debe ser despues de la hora de inicio",
    path: ["endsAt"],
  });

type ClassInput = {
  instructorId: string;
  title: string;
  startsAt: string;
  endsAt: string;
  maxCapacity: number;
};

type Props = {
  open: boolean;
  initialValue: StudioClass | null;
  instructors: Instructor[];
  onClose: () => void;
  onSubmit: (input: ClassInput) => Promise<void>;
};

// Distingue el motivo real del rechazo (RLS vs constraint vs desconocido)
// en vez de un mensaje generico, igual que mapAuthError en apps/web.
function mapSaveError(err: unknown): string {
  const message = err instanceof Error ? err.message : "";
  if (message.includes("row-level security") || message.includes("42501")) {
    return "No tienes permiso para esta accion.";
  }
  if (message.includes("violates check constraint") || message.includes("violates not-null constraint")) {
    return "Revisa los datos del formulario.";
  }
  return "No se pudo guardar. Intenta de nuevo.";
}

function toDatetimeLocal(iso: string): string {
  // datetime-local espera "YYYY-MM-DDTHH:mm" en hora local, sin "Z".
  const date = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function ClassFormModal({ open, initialValue, instructors, onClose, onSubmit }: Props) {
  const [title, setTitle] = useState("");
  const [instructorId, setInstructorId] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [maxCapacity, setMaxCapacity] = useState("10");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const activeInstructors = instructors.filter((i) => i.active);

  useEffect(() => {
    if (!open) return;
    setTitle(initialValue?.title ?? "");
    setInstructorId(initialValue?.instructorId ?? activeInstructors[0]?.id ?? "");
    setStartsAt(initialValue ? toDatetimeLocal(initialValue.startsAt) : "");
    setEndsAt(initialValue ? toDatetimeLocal(initialValue.endsAt) : "");
    setMaxCapacity(String(initialValue?.maxCapacity ?? 10));
    setFieldErrors({});
    setFormError(null);
    // activeInstructors se deriva de `instructors`, que ya esta en deps.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initialValue, instructors]);

  if (!open) return null;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);

    const result = schema.safeParse({ title, instructorId, startsAt, endsAt, maxCapacity });
    if (!result.success) {
      const errors: Record<string, string> = {};
      for (const issue of result.error.issues) {
        errors[String(issue.path[0])] = issue.message;
      }
      setFieldErrors(errors);
      return;
    }
    setFieldErrors({});

    setIsSaving(true);
    try {
      await onSubmit({
        title: result.data.title,
        instructorId: result.data.instructorId,
        startsAt: new Date(result.data.startsAt).toISOString(),
        endsAt: new Date(result.data.endsAt).toISOString(),
        maxCapacity: result.data.maxCapacity,
      });
      onClose();
    } catch (err) {
      setFormError(mapSaveError(err));
      console.error("[classes] guardar fallo", err);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/40 p-4">
      <form
        id="class-form-modal"
        onSubmit={handleSubmit}
        noValidate
        className="flex w-full max-w-sm flex-col gap-3 rounded-lg bg-white p-6"
      >
        <h2 className="text-lg font-semibold text-brand-primary">
          {initialValue ? "Editar clase" : "Nueva clase"}
        </h2>

        <div className="flex flex-col gap-1">
          <input
            id="class-title-input"
            type="text"
            placeholder="Titulo"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
          {fieldErrors.title && <p className="text-xs text-red-600">{fieldErrors.title}</p>}
        </div>

        <div className="flex flex-col gap-1">
          <select
            id="class-instructor-input"
            value={instructorId}
            onChange={(event) => setInstructorId(event.target.value)}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm"
          >
            <option value="">Elige un instructor</option>
            {activeInstructors.map((instructor) => (
              <option key={instructor.id} value={instructor.id}>
                {instructor.fullName}
              </option>
            ))}
          </select>
          {fieldErrors.instructorId && (
            <p className="text-xs text-red-600">{fieldErrors.instructorId}</p>
          )}
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="class-starts-at-input" className="text-xs text-gray-500">
            Inicio
          </label>
          <input
            id="class-starts-at-input"
            type="datetime-local"
            value={startsAt}
            onChange={(event) => setStartsAt(event.target.value)}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
          {fieldErrors.startsAt && <p className="text-xs text-red-600">{fieldErrors.startsAt}</p>}
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="class-ends-at-input" className="text-xs text-gray-500">
            Fin
          </label>
          <input
            id="class-ends-at-input"
            type="datetime-local"
            value={endsAt}
            onChange={(event) => setEndsAt(event.target.value)}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
          {fieldErrors.endsAt && <p className="text-xs text-red-600">{fieldErrors.endsAt}</p>}
        </div>

        <div className="flex flex-col gap-1">
          <input
            id="class-capacity-input"
            type="number"
            min={1}
            placeholder="Cupo maximo"
            value={maxCapacity}
            onChange={(event) => setMaxCapacity(event.target.value)}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
          {fieldErrors.maxCapacity && (
            <p className="text-xs text-red-600">{fieldErrors.maxCapacity}</p>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-gray-600">
            Cancelar
          </button>
          <button
            type="submit"
            disabled={isSaving}
            className="rounded-md bg-brand-primary px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
          >
            {isSaving ? "Guardando..." : "Guardar"}
          </button>
        </div>

        {formError && <p className="text-sm text-red-600">{formError}</p>}
      </form>
    </div>
  );
}
```

- [ ] **Step 5: Crear `ClassesPage`**

```tsx
// apps/admin/src/pages/ClassesPage.tsx
import { useState } from "react";
import { ClassFiltersBar } from "@/features/classes/components/ClassFiltersBar";
import { ClassFormModal } from "@/features/classes/components/ClassFormModal";
import { ClassesTable } from "@/features/classes/components/ClassesTable";
import { useClasses } from "@/features/classes/hooks/useClasses";
import type { ClassFilters, StudioClass } from "@/features/classes/types/StudioClass";
import { useInstructors } from "@/features/instructors/hooks/useInstructors";

export function ClassesPage() {
  const [filters, setFilters] = useState<ClassFilters>({});
  const { classes, loading, error, create, update, cancel } = useClasses(filters);
  const { instructors } = useInstructors();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<StudioClass | null>(null);

  function openCreate() {
    setEditing(null);
    setModalOpen(true);
  }

  function openEdit(studioClass: StudioClass) {
    setEditing(studioClass);
    setModalOpen(true);
  }

  async function handleSubmit(input: {
    instructorId: string;
    title: string;
    startsAt: string;
    endsAt: string;
    maxCapacity: number;
  }) {
    if (editing) {
      await update(editing.id, input);
    } else {
      await create(input);
    }
  }

  return (
    <div id="classes-page" className="mx-auto max-w-4xl p-6">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-brand-primary">Clases</h1>
        <button
          type="button"
          onClick={openCreate}
          className="rounded-md bg-brand-primary px-4 py-2 text-sm font-medium text-white hover:opacity-90"
        >
          Nueva clase
        </button>
      </div>

      <ClassFiltersBar instructors={instructors} filters={filters} onChange={setFilters} />

      {loading && <p className="text-sm text-gray-500">Cargando...</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}
      {!loading && !error && (
        <ClassesTable
          classes={classes}
          instructors={instructors}
          onEdit={openEdit}
          onCancel={(studioClass) => cancel(studioClass.id)}
        />
      )}

      <ClassFormModal
        open={modalOpen}
        initialValue={editing}
        instructors={instructors}
        onClose={() => setModalOpen(false)}
        onSubmit={handleSubmit}
      />
    </div>
  );
}
```

- [ ] **Step 6: Agregar la ruta en `App.tsx`**

```tsx
// apps/admin/src/App.tsx
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { AuthProvider } from "@/features/auth/hooks/AuthProvider";
import { RequireAuth } from "@/routes/RequireAuth";
import { LoginPage } from "@/pages/LoginPage";
import { HomePage } from "@/pages/HomePage";
import { InstructorsPage } from "@/pages/InstructorsPage";
import { ClassesPage } from "@/pages/ClassesPage";

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route
            path="/"
            element={
              <RequireAuth>
                <HomePage />
              </RequireAuth>
            }
          />
          <Route
            path="/instructors"
            element={
              <RequireAuth>
                <InstructorsPage />
              </RequireAuth>
            }
          />
          <Route
            path="/classes"
            element={
              <RequireAuth>
                <ClassesPage />
              </RequireAuth>
            }
          />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
```

- [ ] **Step 7: Typecheck, lint, build**

Run: `cd apps/admin && npm run typecheck && npm run lint && npm run build`
Expected: sin errores.

- [ ] **Step 8: Verificación manual en navegador**

Con sesión iniciada como `SUPER_ADMIN`, navega a `/classes`: crea una clase referenciando un instructor existente, edítala (cambia el horario), cancélala (confirma que sigue en la tabla con estado `CANCELLED`, no desaparece), y prueba los filtros (por instructor, estado, rango de fechas).

- [ ] **Step 9: Commit**

```bash
git add apps/admin/src/features/classes/hooks/useClasses.ts apps/admin/src/features/classes/components apps/admin/src/pages/ClassesPage.tsx apps/admin/src/App.tsx
git commit -m "feat(admin): CRUD de clases"
```

---

### Task 5: Navegación del panel y cierre

**Files:**
- Create: `apps/admin/src/layouts/AdminLayout.tsx`
- Modify: `apps/admin/src/App.tsx`
- Modify: `docs/CURRENT_STATE.md`

**Interfaces:**
- Consumes: `SignOutButton` de `@/features/auth/components/SignOutButton`, `useAuth()`.
- Produces: `<AdminLayout>{children}</AdminLayout>` — envuelve las páginas protegidas con una barra de navegación (Inicio, Instructores, Clases) y el botón de cerrar sesión.

- [ ] **Step 1: Crear `AdminLayout`**

```tsx
// apps/admin/src/layouts/AdminLayout.tsx
import type { ReactNode } from "react";
import { NavLink } from "react-router-dom";
import { SignOutButton } from "@/features/auth/components/SignOutButton";

const NAV_ITEMS = [
  { to: "/", label: "Inicio" },
  { to: "/instructors", label: "Instructores" },
  { to: "/classes", label: "Clases" },
];

export function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div id="admin-layout" className="min-h-screen bg-gray-50">
      <nav className="flex items-center justify-between border-b border-gray-200 bg-white px-6 py-3">
        <div className="flex gap-4">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/"}
              className={({ isActive }) =>
                isActive
                  ? "text-sm font-medium text-brand-primary"
                  : "text-sm font-medium text-gray-500 hover:text-brand-primary"
              }
            >
              {item.label}
            </NavLink>
          ))}
        </div>
        <SignOutButton />
      </nav>
      <main>{children}</main>
    </div>
  );
}
```

- [ ] **Step 2: Envolver las rutas protegidas con `AdminLayout` en `App.tsx`**

```tsx
// apps/admin/src/App.tsx
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { AuthProvider } from "@/features/auth/hooks/AuthProvider";
import { RequireAuth } from "@/routes/RequireAuth";
import { AdminLayout } from "@/layouts/AdminLayout";
import { LoginPage } from "@/pages/LoginPage";
import { HomePage } from "@/pages/HomePage";
import { InstructorsPage } from "@/pages/InstructorsPage";
import { ClassesPage } from "@/pages/ClassesPage";

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route
            path="/"
            element={
              <RequireAuth>
                <AdminLayout>
                  <HomePage />
                </AdminLayout>
              </RequireAuth>
            }
          />
          <Route
            path="/instructors"
            element={
              <RequireAuth>
                <AdminLayout>
                  <InstructorsPage />
                </AdminLayout>
              </RequireAuth>
            }
          />
          <Route
            path="/classes"
            element={
              <RequireAuth>
                <AdminLayout>
                  <ClassesPage />
                </AdminLayout>
              </RequireAuth>
            }
          />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
```

- [ ] **Step 3: Typecheck, lint, build**

Run: `cd apps/admin && npm run typecheck && npm run lint && npm run build`
Expected: sin errores.

- [ ] **Step 4: Verificación end-to-end completa en navegador (checklist del spec)**

Con `npm run dev:admin` corriendo y sesión iniciada como `SUPER_ADMIN`:

1. La barra de navegación aparece en `/`, `/instructors` y `/classes`, con el ítem activo resaltado.
2. Crear instructor → aparece en la tabla.
3. Crear clase referenciando ese instructor → aparece en la tabla, ordenada por fecha.
4. Editar la clase (cambiar horario) → se refleja.
5. Cancelar la clase → estado pasa a `CANCELLED`, sigue en la tabla.
6. Desactivar el instructor → sigue en `InstructorsTable` como inactivo, pero desaparece del selector de `ClassFormModal` para clases nuevas.
7. Filtros de `/classes` (instructor, estado, rango de fechas) devuelven lo esperado.

- [ ] **Step 5: Actualizar `docs/CURRENT_STATE.md`**

Agrega una sección describiendo lo implementado (CRUD de instructores y clases en `apps/admin`, sin cambios de DB) y actualiza "Next Task" para que el siguiente sub-proyecto sea "Paquetes" (según el orden acordado: clases+instructores → paquetes → clientes → reservaciones+lista de espera → academia → pagos → dashboard/notificaciones/settings).

- [ ] **Step 6: Commit**

```bash
git add apps/admin/src/layouts/AdminLayout.tsx apps/admin/src/App.tsx docs/CURRENT_STATE.md
git commit -m "feat(admin): navegacion del panel; docs al dia"
```
