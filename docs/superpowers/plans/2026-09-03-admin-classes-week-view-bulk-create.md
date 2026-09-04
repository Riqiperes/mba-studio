# Vista Semanal de Clases + Creación en Lote (Admin) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reemplazar la tabla de `ClassesPage` (apps/admin) por una grilla semanal Domingo-Sábado navegable, y permitir crear varias clases de una sola vez eligiendo días de la semana + repetición en N semanas, sin construir un sistema de recurrencia.

**Architecture:** Todo client-side, sin migraciones ni RPC nuevas. `classesService.createClasses()` expande día×semana a filas concretas de `studio_classes`, consulta clases existentes en el rango para detectar solapamientos de horario (cualquier instructor), inserta en batch las que no chocan y devuelve las salteadas para que la UI avise. La vista semanal reutiliza el patrón de `WeekSelector`/agrupación-por-día ya existente en `apps/web`, adaptado a semana Domingo-Sábado (duplicado en `apps/admin`, mismo patrón de duplicación que ya existe entre ambas apps para auth/`supabaseClient`).

**Tech Stack:** React 19 + TypeScript strict + Zod (ya instalados en `apps/admin`), Supabase JS client existente. Sin dependencias nuevas.

**Spec:** `docs/superpowers/specs/2026-09-03-admin-classes-week-view-bulk-create-design.md`

## Global Constraints

- Semana Domingo→Sábado, `weekday` 0-6 con 0=Domingo, misma convención que `academy_group_schedules.day_of_week` (`DAY_LABELS` en `AcademyGroupFormModal.tsx`) — reusar esa misma lista de labels (redeclarada localmente en cada archivo que la necesita, no crear un módulo compartido para 7 strings).
- Sin frameworks de test nuevos: ni `apps/admin` ni `apps/web` tienen Vitest/Jest instalado (`apps/admin/package.json` no tiene script `test`). Verificación = `npm run typecheck && npm run lint && npm run build` (workspace `apps/admin`) + verificación manual en navegador (`npm run dev:admin`), mismo patrón que el resto del proyecto documentado en `docs/CURRENT_STATE.md`. No instalar Vitest ni escribir archivos `*.test.ts` para este plan.
- No tocar `apps/web` ni `supabase/migrations/` — todo el cambio vive en `apps/admin/src/features/classes/` y `apps/admin/src/pages/ClassesPage.tsx`.
- Sin RPC ni migración SQL nueva — decisión explícita del spec (bajo volumen de uso concurrente).
- El botón "Nueva clase" en `ClassesPage` no cambia de posición, texto ni handler (`openCreate`) — solo el modal que abre gana campos nuevos en modo creación.
- Al tocar `ClassFormModal.tsx`, reemplazar el `mapSaveError` local por `getErrorMessage` (`apps/admin/src/utils/getErrorMessage.ts`, ya usado en `AcademyGroupFormModal.tsx`) — cierra la deuda técnica de ese archivo documentada en `docs/roadmap.md` ("Deuda tecnica conocida"), justificado porque el archivo ya se toca para el manejo de errores de `createClasses`.

---

### Task 1: `weekUtils.ts` — utilidades de semana Domingo-Sábado

**Files:**
- Create: `apps/admin/src/features/classes/utils/weekUtils.ts`

**Interfaces:**
- Produces: `getWeekStart(date: Date): Date`, `getWeekDays(weekStart: Date): Date[]`, `getWeekLabel(weekStart: Date): string`, `formatDateKey(date: Date): string`, `addWeeksLocal(date: Date, weeks: number): Date` — usados por Task 2, 6 y 8.

- [ ] **Step 1: Escribir el archivo**

```ts
// apps/admin/src/features/classes/utils/weekUtils.ts

/** Retrocede al Domingo de la semana de `date` (0 = Domingo en JS Date). */
export function getWeekStart(date: Date): Date {
  const d = new Date(date);
  d.setDate(d.getDate() - d.getDay());
  return d;
}

/** Las 7 fechas de la semana, Domingo a Sabado, empezando en `weekStart`. */
export function getWeekDays(weekStart: Date): Date[] {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    return d;
  });
}

/** "D mmm – D mmm" del rango de la semana. */
export function getWeekLabel(weekStart: Date): string {
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);
  const startStr = weekStart.toLocaleDateString("es-MX", { day: "numeric", month: "short" });
  const endStr = weekEnd.toLocaleDateString("es-MX", { day: "numeric", month: "short" });
  return `${startStr} – ${endStr}`;
}

/** YYYY-MM-DD en hora local (para agrupar clases por dia y comparar semanas). */
export function formatDateKey(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function addWeeksLocal(date: Date, weeks: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + weeks * 7);
  return d;
}
```

- [ ] **Step 2: Verificar tipos**

Run: `npm run typecheck --workspace apps/admin`
Expected: sin errores (archivo nuevo, sin consumidores todavia, solo valida sintaxis/tipos propios).

- [ ] **Step 3: Commit**

```bash
git add apps/admin/src/features/classes/utils/weekUtils.ts
git commit -m "feat(admin): add Sunday-start week utils for classes grid"
```

---

### Task 2: `WeekSelector.tsx` (admin) — navegación por semana

**Files:**
- Create: `apps/admin/src/features/classes/components/WeekSelector.tsx`

**Interfaces:**
- Consumes: `getWeekStart`, `getWeekLabel`, `formatDateKey`, `addWeeksLocal` de `../utils/weekUtils` (Task 1).
- Produces: componente `WeekSelector({ selectedWeekStart: string; onChange: (weekStart: string) => void })` — usado por Task 8 (`ClassesPage`). `selectedWeekStart`/el argumento de `onChange` son `YYYY-MM-DD` (Domingo de la semana).

- [ ] **Step 1: Escribir el archivo**

```tsx
// apps/admin/src/features/classes/components/WeekSelector.tsx
import { addWeeksLocal, formatDateKey, getWeekLabel, getWeekStart } from "../utils/weekUtils";

type Props = {
  selectedWeekStart: string; // YYYY-MM-DD (Domingo de la semana)
  onChange: (weekStart: string) => void;
};

export function WeekSelector({ selectedWeekStart, onChange }: Props) {
  const todayWeekStart = formatDateKey(getWeekStart(new Date()));

  function goToWeek(weeksOffset: number) {
    const current = new Date(`${selectedWeekStart}T00:00:00`);
    onChange(formatDateKey(addWeeksLocal(current, weeksOffset)));
  }

  return (
    <div id="week-selector" className="mb-4 flex items-center justify-between rounded-lg border border-gray-200 bg-white p-3">
      <button
        type="button"
        onClick={() => goToWeek(-1)}
        className="rounded-md p-2 text-gray-500 hover:bg-gray-100"
        aria-label="Semana anterior"
      >
        ←
      </button>

      <div className="flex items-center gap-3">
        <span className="font-medium text-gray-900">
          {getWeekLabel(new Date(`${selectedWeekStart}T00:00:00`))}
        </span>
        {selectedWeekStart !== todayWeekStart && (
          <button
            type="button"
            onClick={() => onChange(todayWeekStart)}
            className="rounded-md bg-brand-primary px-3 py-1 text-xs font-medium text-white hover:opacity-90"
          >
            Hoy
          </button>
        )}
      </div>

      <button
        type="button"
        onClick={() => goToWeek(1)}
        className="rounded-md p-2 text-gray-500 hover:bg-gray-100"
        aria-label="Semana siguiente"
      >
        →
      </button>
    </div>
  );
}
```

- [ ] **Step 2: Verificar tipos**

Run: `npm run typecheck --workspace apps/admin`
Expected: sin errores.

- [ ] **Step 3: Commit**

```bash
git add apps/admin/src/features/classes/components/WeekSelector.tsx
git commit -m "feat(admin): add WeekSelector for classes weekly view"
```

---

### Task 3: `classesService.createClasses()` — creación en lote + tipos

**Files:**
- Modify: `apps/admin/src/features/classes/types/StudioClass.ts`
- Modify: `apps/admin/src/features/classes/services/classesService.ts`

**Interfaces:**
- Produces: tipos `CreateClassesInput`, `CreateClassesResult` (en `types/StudioClass.ts`); función `createClasses(businessId: string, input: CreateClassesInput): Promise<CreateClassesResult>` (en `classesService.ts`) — usada por Task 4 (`useClasses`).
- Elimina: `createClass` (singular) — confirmado sin otros callers fuera de `useClasses.ts` (Task 4 lo reemplaza).
- Consumes: `listClasses` (ya existe en el mismo archivo, sin cambios de firma).

- [ ] **Step 1: Agregar tipos a `types/StudioClass.ts`**

Agregar al final del archivo (después de `ClassFilters`):

```ts
export type CreateClassesInput = {
  instructorId: string;
  title: string;
  weekdays: number[]; // 0=Domingo .. 6=Sabado
  startTime: string; // "HH:mm"
  endTime: string; // "HH:mm"
  maxCapacity: number;
  weekStart: string; // YYYY-MM-DD, Domingo de la semana de referencia
  weeksCount: number;
};

export type CreateClassesResult = {
  created: StudioClass[];
  skipped: { startsAt: string; reason: string }[];
};
```

- [ ] **Step 2: Reemplazar `createClass` por `createClasses` en `classesService.ts`**

Importar el tipo nuevo en el `import type` existente (línea 2):

```ts
import type { ClassFilters, CreateClassesInput, CreateClassesResult, StudioClass } from "../types/StudioClass";
```

Borrar la función `createClass` completa (líneas 61-80 del archivo actual) y reemplazarla por:

```ts
// Suma `days` dias a una fecha YYYY-MM-DD en UTC -- misma tecnica que
// nextDayIso arriba, evita que el timezone del navegador corra la fecha
// al operar sobre un string de solo-fecha.
function addDays(dateStr: string, days: number): string {
  const date = new Date(`${dateStr}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

// Combina una fecha (YYYY-MM-DD) con una hora local ("HH:mm") en un
// instante ISO -- misma interpretacion de hora local que usa
// ClassFormModal para datetime-local (new Date sin "Z" = hora local).
function combineDateAndTime(dateStr: string, time: string): string {
  return new Date(`${dateStr}T${time}`).toISOString();
}

function rangesOverlap(aStart: string, aEnd: string, bStart: string, bEnd: string): boolean {
  return aStart < bEnd && bStart < aEnd;
}

export async function createClasses(
  businessId: string,
  input: CreateClassesInput,
): Promise<CreateClassesResult> {
  const slots = input.weekdays.flatMap((weekday) =>
    Array.from({ length: input.weeksCount }, (_, week) => {
      const date = addDays(input.weekStart, week * 7 + weekday);
      return {
        date,
        startsAt: combineDateAndTime(date, input.startTime),
        endsAt: combineDateAndTime(date, input.endTime),
      };
    }),
  );

  const lastDate = slots.reduce((max, slot) => (slot.date > max ? slot.date : max), slots[0].date);
  const existing = (await listClasses({ dateFrom: input.weekStart, dateTo: lastDate })).filter(
    (studioClass) => studioClass.status !== "CANCELLED",
  );

  const toCreate: { startsAt: string; endsAt: string }[] = [];
  const skipped: { startsAt: string; reason: string }[] = [];

  for (const slot of slots) {
    const conflict = existing.some((studioClass) =>
      rangesOverlap(slot.startsAt, slot.endsAt, studioClass.startsAt, studioClass.endsAt),
    );
    if (conflict) {
      skipped.push({ startsAt: slot.startsAt, reason: "Ya existe una clase en ese horario" });
    } else {
      toCreate.push(slot);
    }
  }

  if (toCreate.length === 0) {
    return { created: [], skipped };
  }

  const { data, error } = await supabase
    .from("studio_classes")
    .insert(
      toCreate.map((slot) => ({
        business_id: businessId,
        instructor_id: input.instructorId,
        title: input.title,
        starts_at: slot.startsAt,
        ends_at: slot.endsAt,
        max_capacity: input.maxCapacity,
      })),
    )
    .select(SELECT_COLUMNS);

  if (error) throw error;
  return { created: data.map(toStudioClass), skipped };
}
```

- [ ] **Step 3: Verificar tipos**

Run: `npm run typecheck --workspace apps/admin`
Expected: sin errores (nada llama a `createClasses` todavia, pero el archivo debe compilar solo).

- [ ] **Step 4: Commit**

```bash
git add apps/admin/src/features/classes/types/StudioClass.ts apps/admin/src/features/classes/services/classesService.ts
git commit -m "feat(admin): add createClasses batch creation with overlap check"
```

---

### Task 4: `useClasses.ts` — usar `createClasses`

**Files:**
- Modify: `apps/admin/src/features/classes/hooks/useClasses.ts`

**Interfaces:**
- Consumes: `createClasses`, `CreateClassesInput`, `CreateClassesResult` de `../services/classesService` / `../types/StudioClass` (Task 3).
- Produces: `create(input: CreateClassesInput): Promise<CreateClassesResult>` (reemplaza la firma anterior de `create`) — usado por Task 8 (`ClassesPage`, pasado directo a `ClassFormModal` como `onCreate`).

- [ ] **Step 1: Editar el archivo**

Reemplazar el import (línea 3) y el tipo local `ClassInput`/función `create` (líneas 3, 6-12, 41-45) por:

```ts
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/features/auth/hooks/AuthProvider";
import { cancelClass, createClasses, listClasses, updateClass } from "../services/classesService";
import type { ClassFilters, CreateClassesInput, CreateClassesResult, StudioClass } from "../types/StudioClass";

type UpdateClassInput = {
  instructorId?: string;
  title?: string;
  startsAt?: string;
  endsAt?: string;
  maxCapacity?: number;
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.instructorId, filters.status, filters.dateFrom, filters.dateTo]);

  useEffect(() => {
    reload();
  }, [reload]);

  async function create(input: CreateClassesInput): Promise<CreateClassesResult> {
    if (!profile) throw new Error("Falta el perfil del usuario actual.");
    const result = await createClasses(profile.businessId, input);
    await reload();
    return result;
  }

  async function update(id: string, input: UpdateClassInput) {
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

- [ ] **Step 2: Verificar tipos**

Run: `npm run typecheck --workspace apps/admin`
Expected: error esperado en `apps/admin/src/pages/ClassesPage.tsx` (todavía llama a `create`/`onSubmit` con la firma vieja) — se corrige en Task 8. Confirmar que el error señalado es justo ahí y no en `useClasses.ts`.

- [ ] **Step 3: Commit**

```bash
git add apps/admin/src/features/classes/hooks/useClasses.ts
git commit -m "feat(admin): wire useClasses.create to batch createClasses"
```

---

### Task 5: `ClassFormModal.tsx` — selector de días + repetición en creación

**Files:**
- Modify: `apps/admin/src/features/classes/components/ClassFormModal.tsx`

**Interfaces:**
- Consumes: `CreateClassesInput`, `CreateClassesResult` de `../types/StudioClass` (Task 3); `getErrorMessage` de `@/utils/getErrorMessage`.
- Produces: `ClassFormModal` con props `{ open, initialValue, instructors, weekStart: Date, onClose, onCreate: (input: CreateClassesInput) => Promise<CreateClassesResult>, onUpdate: (id: string, input: UpdateClassInput) => Promise<void> }` — usado por Task 8.

- [ ] **Step 1: Reescribir el archivo completo**

```tsx
// apps/admin/src/features/classes/components/ClassFormModal.tsx
import { useEffect, useState, type FormEvent } from "react";
import { z } from "zod";
import type { Instructor } from "@/features/instructors/types/Instructor";
import { getErrorMessage } from "@/utils/getErrorMessage";
import type { CreateClassesInput, CreateClassesResult, StudioClass } from "../types/StudioClass";
import { formatDateKey } from "../utils/weekUtils";

const DAY_LABELS = ["Domingo", "Lunes", "Martes", "Miercoles", "Jueves", "Viernes", "Sabado"];

const editSchema = z
  .object({
    title: z.string().min(1, "El titulo es obligatorio"),
    instructorId: z.string().min(1, "Elige un instructor"),
    startsAt: z.string().min(1, "La fecha/hora de inicio es obligatoria"),
    endsAt: z.string().min(1, "La fecha/hora de fin es obligatoria"),
    maxCapacity: z.coerce
      .number()
      .int("El cupo debe ser un numero entero")
      .positive("El cupo debe ser mayor a 0"),
  })
  .refine((value) => new Date(value.endsAt) > new Date(value.startsAt), {
    message: "La hora de fin debe ser despues de la hora de inicio",
    path: ["endsAt"],
  });

const createSchema = z
  .object({
    title: z.string().min(1, "El titulo es obligatorio"),
    instructorId: z.string().min(1, "Elige un instructor"),
    weekdays: z.array(z.number().int().min(0).max(6)).min(1, "Elige al menos un dia"),
    startTime: z.string().min(1, "La hora de inicio es obligatoria"),
    endTime: z.string().min(1, "La hora de fin es obligatoria"),
    weeksCount: z.coerce.number().int().positive("Debe ser al menos 1").max(52, "Maximo 52 semanas"),
    maxCapacity: z.coerce
      .number()
      .int("El cupo debe ser un numero entero")
      .positive("El cupo debe ser mayor a 0"),
  })
  .refine((value) => value.endTime > value.startTime, {
    message: "La hora de fin debe ser despues de la hora de inicio",
    path: ["endTime"],
  });

type UpdateClassInput = {
  instructorId?: string;
  title?: string;
  startsAt?: string;
  endsAt?: string;
  maxCapacity?: number;
};

type Props = {
  open: boolean;
  initialValue: StudioClass | null;
  instructors: Instructor[];
  weekStart: Date;
  onClose: () => void;
  onCreate: (input: CreateClassesInput) => Promise<CreateClassesResult>;
  onUpdate: (id: string, input: UpdateClassInput) => Promise<void>;
};

function toDatetimeLocal(iso: string): string {
  // datetime-local espera "YYYY-MM-DDTHH:mm" en hora local, sin "Z".
  const date = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function ClassFormModal({
  open,
  initialValue,
  instructors,
  weekStart,
  onClose,
  onCreate,
  onUpdate,
}: Props) {
  const [title, setTitle] = useState("");
  const [instructorId, setInstructorId] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [weekdays, setWeekdays] = useState<number[]>([]);
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [weeksCount, setWeeksCount] = useState("1");
  const [maxCapacity, setMaxCapacity] = useState("10");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [skipped, setSkipped] = useState<{ startsAt: string; reason: string }[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  const activeInstructors = instructors.filter((i) => i.active);
  // Si se edita una clase cuyo instructor ya fue desactivado, el <select>
  // controlado necesita esa opcion presente o queda mostrando el
  // placeholder aunque el estado siga con el id real (la clase conserva
  // su instructor original al guardar, esto es solo para que el select
  // no mienta visualmente).
  const selectableInstructors =
    initialValue && !activeInstructors.some((i) => i.id === initialValue.instructorId)
      ? [...activeInstructors, ...instructors.filter((i) => i.id === initialValue.instructorId)]
      : activeInstructors;

  useEffect(() => {
    if (!open) return;
    setTitle(initialValue?.title ?? "");
    setInstructorId(initialValue?.instructorId ?? activeInstructors[0]?.id ?? "");
    setStartsAt(initialValue ? toDatetimeLocal(initialValue.startsAt) : "");
    setEndsAt(initialValue ? toDatetimeLocal(initialValue.endsAt) : "");
    setWeekdays(initialValue ? [] : [new Date().getDay()]);
    setStartTime("");
    setEndTime("");
    setWeeksCount("1");
    setMaxCapacity(String(initialValue?.maxCapacity ?? 10));
    setFieldErrors({});
    setFormError(null);
    setSkipped([]);
    // activeInstructors se deriva de `instructors`, que ya esta en deps.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initialValue, instructors]);

  useEffect(() => {
    if (!open) return;
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  function toggleWeekday(day: number) {
    setWeekdays((prev) => (prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort((a, b) => a - b)));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    setSkipped([]);

    if (initialValue) {
      const result = editSchema.safeParse({ title, instructorId, startsAt, endsAt, maxCapacity });
      if (!result.success) {
        const errors: Record<string, string> = {};
        for (const issue of result.error.issues) errors[String(issue.path[0])] = issue.message;
        setFieldErrors(errors);
        return;
      }
      setFieldErrors({});
      setIsSaving(true);
      try {
        await onUpdate(initialValue.id, {
          title: result.data.title,
          instructorId: result.data.instructorId,
          startsAt: new Date(result.data.startsAt).toISOString(),
          endsAt: new Date(result.data.endsAt).toISOString(),
          maxCapacity: result.data.maxCapacity,
        });
        onClose();
      } catch (err) {
        setFormError(getErrorMessage(err, "No se pudo guardar. Intenta de nuevo."));
        console.error("[classes] guardar fallo", err);
      } finally {
        setIsSaving(false);
      }
      return;
    }

    const result = createSchema.safeParse({
      title,
      instructorId,
      weekdays,
      startTime,
      endTime,
      weeksCount,
      maxCapacity,
    });
    if (!result.success) {
      const errors: Record<string, string> = {};
      for (const issue of result.error.issues) errors[String(issue.path[0])] = issue.message;
      setFieldErrors(errors);
      return;
    }
    setFieldErrors({});

    setIsSaving(true);
    try {
      const created = await onCreate({
        title: result.data.title,
        instructorId: result.data.instructorId,
        weekdays: result.data.weekdays,
        startTime: result.data.startTime,
        endTime: result.data.endTime,
        maxCapacity: result.data.maxCapacity,
        weekStart: formatDateKey(weekStart),
        weeksCount: result.data.weeksCount,
      });
      if (created.skipped.length > 0) {
        setSkipped(created.skipped);
      } else {
        onClose();
      }
    } catch (err) {
      setFormError(getErrorMessage(err, "No se pudo guardar. Intenta de nuevo."));
      console.error("[classes] guardar lote fallo", err);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <form
        id="class-form-modal"
        onSubmit={handleSubmit}
        onClick={(event) => event.stopPropagation()}
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
            {selectableInstructors.map((instructor) => (
              <option key={instructor.id} value={instructor.id}>
                {instructor.fullName}
                {!instructor.active ? " (inactivo)" : ""}
              </option>
            ))}
          </select>
          {fieldErrors.instructorId && <p className="text-xs text-red-600">{fieldErrors.instructorId}</p>}
        </div>

        {initialValue ? (
          <>
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
          </>
        ) : (
          <>
            <div className="flex flex-col gap-1">
              <span className="text-xs text-gray-500">Repetir en estos dias</span>
              <div className="flex flex-wrap gap-2">
                {DAY_LABELS.map((label, dayIndex) => (
                  <label key={dayIndex} className="flex items-center gap-1 text-xs">
                    <input
                      type="checkbox"
                      checked={weekdays.includes(dayIndex)}
                      onChange={() => toggleWeekday(dayIndex)}
                    />
                    {label}
                  </label>
                ))}
              </div>
              {fieldErrors.weekdays && <p className="text-xs text-red-600">{fieldErrors.weekdays}</p>}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="flex flex-col gap-1">
                <label htmlFor="class-start-time-input" className="text-xs text-gray-500">
                  Hora inicio
                </label>
                <input
                  id="class-start-time-input"
                  type="time"
                  value={startTime}
                  onChange={(event) => setStartTime(event.target.value)}
                  className="rounded-md border border-gray-300 px-3 py-2 text-sm"
                />
                {fieldErrors.startTime && <p className="text-xs text-red-600">{fieldErrors.startTime}</p>}
              </div>
              <div className="flex flex-col gap-1">
                <label htmlFor="class-end-time-input" className="text-xs text-gray-500">
                  Hora fin
                </label>
                <input
                  id="class-end-time-input"
                  type="time"
                  value={endTime}
                  onChange={(event) => setEndTime(event.target.value)}
                  className="rounded-md border border-gray-300 px-3 py-2 text-sm"
                />
                {fieldErrors.endTime && <p className="text-xs text-red-600">{fieldErrors.endTime}</p>}
              </div>
            </div>
            <div className="flex flex-col gap-1">
              <label htmlFor="class-weeks-count-input" className="text-xs text-gray-500">
                Repetir N semanas
              </label>
              <input
                id="class-weeks-count-input"
                type="number"
                min={1}
                max={52}
                value={weeksCount}
                onChange={(event) => setWeeksCount(event.target.value)}
                className="rounded-md border border-gray-300 px-3 py-2 text-sm"
              />
              {fieldErrors.weeksCount && <p className="text-xs text-red-600">{fieldErrors.weeksCount}</p>}
            </div>
          </>
        )}

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
          {fieldErrors.maxCapacity && <p className="text-xs text-red-600">{fieldErrors.maxCapacity}</p>}
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-gray-600">
            {skipped.length > 0 ? "Cerrar" : "Cancelar"}
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
        {skipped.length > 0 && (
          <div className="rounded-md bg-yellow-50 p-2 text-xs text-yellow-800">
            <p className="font-medium">Se saltearon {skipped.length} clase(s) por conflicto de horario:</p>
            <ul className="list-disc pl-4">
              {skipped.map((item) => (
                <li key={item.startsAt}>
                  {new Date(item.startsAt).toLocaleString("es-MX")} — {item.reason}
                </li>
              ))}
            </ul>
          </div>
        )}
      </form>
    </div>
  );
}
```

- [ ] **Step 2: Verificar tipos**

Run: `npm run typecheck --workspace apps/admin`
Expected: error esperado en `ClassesPage.tsx` (pasa `onSubmit` que ya no existe como prop) — se corrige en Task 8.

- [ ] **Step 3: Commit**

```bash
git add apps/admin/src/features/classes/components/ClassFormModal.tsx
git commit -m "feat(admin): add weekday+repeat batch creation UI to ClassFormModal"
```

---

### Task 6: `ClassesWeekGrid.tsx` — grilla semanal (reemplaza `ClassesTable`)

**Files:**
- Create: `apps/admin/src/features/classes/components/ClassesWeekGrid.tsx`
- Delete: `apps/admin/src/features/classes/components/ClassesTable.tsx` (reemplazada por completo, sin otros consumidores).

**Interfaces:**
- Consumes: `formatDateKey`, `getWeekDays` de `../utils/weekUtils` (Task 1).
- Produces: `ClassesWeekGrid({ weekStart: Date; classes: StudioClass[]; instructors: Instructor[]; onEdit: (c: StudioClass) => void; onCancel: (c: StudioClass) => void })` — usado por Task 8.

- [ ] **Step 1: Crear `ClassesWeekGrid.tsx`**

```tsx
// apps/admin/src/features/classes/components/ClassesWeekGrid.tsx
import { useNavigate } from "react-router-dom";
import type { Instructor } from "@/features/instructors/types/Instructor";
import type { StudioClass } from "../types/StudioClass";
import { formatDateKey, getWeekDays } from "../utils/weekUtils";

const DAY_LABELS = ["Domingo", "Lunes", "Martes", "Miercoles", "Jueves", "Viernes", "Sabado"];

type Props = {
  weekStart: Date;
  classes: StudioClass[];
  instructors: Instructor[];
  onEdit: (studioClass: StudioClass) => void;
  onCancel: (studioClass: StudioClass) => void;
};

export function ClassesWeekGrid({ weekStart, classes, instructors, onEdit, onCancel }: Props) {
  const navigate = useNavigate();
  const days = getWeekDays(weekStart);

  function instructorName(instructorId: string): string {
    return instructors.find((i) => i.id === instructorId)?.fullName ?? "—";
  }

  function formatTime(iso: string): string {
    return new Date(iso).toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" });
  }

  const classesByDay = new Map<string, StudioClass[]>();
  for (const day of days) classesByDay.set(formatDateKey(day), []);
  for (const studioClass of classes) {
    const key = formatDateKey(new Date(studioClass.startsAt));
    classesByDay.get(key)?.push(studioClass);
  }
  for (const dayClasses of classesByDay.values()) {
    dayClasses.sort((a, b) => a.startsAt.localeCompare(b.startsAt));
  }

  return (
    <div id="classes-week-grid" className="grid grid-cols-7 gap-2">
      {days.map((day, index) => {
        const key = formatDateKey(day);
        const dayClasses = classesByDay.get(key) ?? [];
        return (
          <div key={key} className="flex flex-col gap-2">
            <div className="text-center text-xs font-medium text-gray-500">
              {DAY_LABELS[index]}
              <br />
              {day.toLocaleDateString("es-MX", { day: "numeric", month: "short" })}
            </div>
            {dayClasses.length === 0 && <p className="text-center text-xs text-gray-300">—</p>}
            {dayClasses.map((studioClass) => (
              <div
                key={studioClass.id}
                onClick={() => navigate(`/classes/${studioClass.id}`)}
                className="cursor-pointer rounded-md border border-gray-200 p-2 text-xs hover:bg-gray-50"
              >
                <p className="font-medium text-gray-900">{studioClass.title}</p>
                <p className="text-gray-500">
                  {formatTime(studioClass.startsAt)}–{formatTime(studioClass.endsAt)}
                </p>
                <p className="text-gray-500">{instructorName(studioClass.instructorId)}</p>
                <p className="text-gray-400">Cupo {studioClass.maxCapacity}</p>
                <div className="mt-1 flex gap-2">
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      onEdit(studioClass);
                    }}
                    className="text-brand-primary hover:underline"
                  >
                    Editar
                  </button>
                  {studioClass.status === "SCHEDULED" && (
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        onCancel(studioClass);
                      }}
                      className="text-red-600 hover:underline"
                    >
                      Cancelar
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 2: Borrar `ClassesTable.tsx`**

```bash
git rm apps/admin/src/features/classes/components/ClassesTable.tsx
```

- [ ] **Step 3: Verificar tipos**

Run: `npm run typecheck --workspace apps/admin`
Expected: error esperado en `ClassesPage.tsx` (todavia importa `ClassesTable`) — se corrige en Task 8.

- [ ] **Step 4: Commit**

```bash
git add apps/admin/src/features/classes/components/ClassesWeekGrid.tsx
git commit -m "feat(admin): replace ClassesTable with 7-column weekly grid"
```

---

### Task 7: `ClassFiltersBar.tsx` — solo filtro de instructor

**Files:**
- Modify: `apps/admin/src/features/classes/components/ClassFiltersBar.tsx`

**Interfaces:**
- Produces: `ClassFiltersBar({ instructors: Instructor[]; filters: ClassFilters; onChange: (next: ClassFilters) => void })` (misma firma de props que antes, `ClassFilters` sin cambios de tipo — solo se dejan de renderizar los campos `status`/`dateFrom`/`dateTo`).

- [ ] **Step 1: Reescribir el archivo completo**

```tsx
// apps/admin/src/features/classes/components/ClassFiltersBar.tsx
import type { Instructor } from "@/features/instructors/types/Instructor";
import type { ClassFilters } from "../types/StudioClass";

type Props = {
  instructors: Instructor[];
  filters: ClassFilters;
  onChange: (next: ClassFilters) => void;
};

export function ClassFiltersBar({ instructors, filters, onChange }: Props) {
  function updateInstructorFilter(value: string) {
    const nextFilters: ClassFilters = { ...filters };
    if (value) {
      nextFilters.instructorId = value;
    } else {
      delete nextFilters.instructorId;
    }
    onChange(nextFilters);
  }

  return (
    <div id="class-filters-bar" className="mb-4 flex flex-wrap gap-2">
      <select
        id="class-filter-instructor"
        value={filters.instructorId ?? ""}
        onChange={(event) => updateInstructorFilter(event.target.value)}
        className="rounded-md border border-gray-300 px-2 py-1 text-sm"
      >
        <option value="">Todos los instructores</option>
        {instructors.map((instructor) => (
          <option key={instructor.id} value={instructor.id}>
            {instructor.fullName}
          </option>
        ))}
      </select>
    </div>
  );
}
```

- [ ] **Step 2: Verificar tipos**

Run: `npm run typecheck --workspace apps/admin`
Expected: sin errores nuevos relacionados a este archivo (los errores de `ClassesPage.tsx` siguen pendientes de Task 8).

- [ ] **Step 3: Commit**

```bash
git add apps/admin/src/features/classes/components/ClassFiltersBar.tsx
git commit -m "feat(admin): simplify ClassFiltersBar to instructor-only filter"
```

---

### Task 8: `ClassesPage.tsx` — integrar semana, grilla y creación en lote

**Files:**
- Modify: `apps/admin/src/pages/ClassesPage.tsx`

**Interfaces:**
- Consumes: `WeekSelector` (Task 2), `ClassesWeekGrid` (Task 6), `ClassFiltersBar` (Task 7), `getWeekStart`/`getWeekDays`/`formatDateKey` de `../features/classes/utils/weekUtils` (Task 1), `useClasses` con `create`/`update` ya reescritos (Task 4), `ClassFormModal` con props `onCreate`/`onUpdate`/`weekStart` (Task 5).

- [ ] **Step 1: Reescribir el archivo completo**

```tsx
// apps/admin/src/pages/ClassesPage.tsx
import { useMemo, useState } from "react";
import { ClassFiltersBar } from "@/features/classes/components/ClassFiltersBar";
import { ClassFormModal } from "@/features/classes/components/ClassFormModal";
import { ClassesWeekGrid } from "@/features/classes/components/ClassesWeekGrid";
import { WeekSelector } from "@/features/classes/components/WeekSelector";
import { useClasses } from "@/features/classes/hooks/useClasses";
import type { ClassFilters, StudioClass } from "@/features/classes/types/StudioClass";
import { formatDateKey, getWeekDays, getWeekStart } from "@/features/classes/utils/weekUtils";
import { useInstructors } from "@/features/instructors/hooks/useInstructors";
import { BackButton } from "@/components/ui/BackButton";

export function ClassesPage() {
  const [instructorFilter, setInstructorFilter] = useState<ClassFilters>({});
  const [weekStart, setWeekStart] = useState<Date>(() => getWeekStart(new Date()));

  const filters = useMemo<ClassFilters>(() => {
    const days = getWeekDays(weekStart);
    return {
      ...instructorFilter,
      dateFrom: formatDateKey(days[0]),
      dateTo: formatDateKey(days[6]),
    };
  }, [instructorFilter, weekStart]);

  const { classes, loading, error, create, update, cancel } = useClasses(filters);
  const { instructors, error: instructorsError } = useInstructors();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<StudioClass | null>(null);
  const [cancelError, setCancelError] = useState<string | null>(null);

  function openCreate() {
    setEditing(null);
    setModalOpen(true);
  }

  function openEdit(studioClass: StudioClass) {
    setEditing(studioClass);
    setModalOpen(true);
  }

  async function handleCancel(studioClass: StudioClass) {
    if (!window.confirm(`Cancelar la clase "${studioClass.title}"?`)) {
      return;
    }
    setCancelError(null);
    try {
      await cancel(studioClass.id);
    } catch (err) {
      setCancelError("No se pudo cancelar la clase. Intenta de nuevo.");
      console.error("[classes] cancelar fallo", err);
    }
  }

  return (
    <div id="classes-page" className="mx-auto max-w-5xl p-6">
      <BackButton />
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

      <WeekSelector selectedWeekStart={formatDateKey(weekStart)} onChange={(value) => setWeekStart(new Date(`${value}T00:00:00`))} />
      <ClassFiltersBar instructors={instructors} filters={instructorFilter} onChange={setInstructorFilter} />

      {loading && <p className="text-sm text-gray-500">Cargando...</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}
      {instructorsError && <p className="text-sm text-red-600">{instructorsError}</p>}
      {cancelError && <p className="text-sm text-red-600">{cancelError}</p>}
      {!loading && !error && (
        <ClassesWeekGrid
          weekStart={weekStart}
          classes={classes}
          instructors={instructors}
          onEdit={openEdit}
          onCancel={handleCancel}
        />
      )}

      <ClassFormModal
        open={modalOpen}
        initialValue={editing}
        instructors={instructors}
        weekStart={weekStart}
        onClose={() => setModalOpen(false)}
        onCreate={create}
        onUpdate={update}
      />
    </div>
  );
}
```

- [ ] **Step 2: Verificar tipos, lint y build**

Run: `npm run typecheck --workspace apps/admin && npm run lint --workspace apps/admin && npm run build --workspace apps/admin`
Expected: sin errores en ninguno de los tres comandos.

- [ ] **Step 3: Commit**

```bash
git add apps/admin/src/pages/ClassesPage.tsx
git commit -m "feat(admin): wire weekly grid, WeekSelector and batch create into ClassesPage"
```

---

### Task 9: Verificación manual en navegador

**Files:** ninguno (solo verificación, sin cambios de código salvo fixes que surjan).

- [ ] **Step 1: Levantar el admin**

Run: `npm run dev:admin`
Expected: sirve en `http://localhost:5174` (o el puerto configurado), sin errores en consola al cargar `/classes`.

- [ ] **Step 2: Verificar grilla semanal**

En el navegador, entrar a `/classes`. Confirmar: 7 columnas Domingo→Sábado, clases existentes (si las hay) ordenadas por hora dentro de su columna, columna de hoy visible.

- [ ] **Step 3: Verificar `WeekSelector`**

Click en `→` (semana siguiente): la grilla cambia a la semana que sigue, el label de fecha se actualiza, aparece el botón "Hoy". Click en "Hoy": vuelve a la semana actual y el botón "Hoy" desaparece. Click en `←`: retrocede una semana.

- [ ] **Step 4: Verificar filtro de instructor**

Elegir un instructor en el filtro: la grilla muestra solo sus clases en la semana visible. Volver a "Todos los instructores".

- [ ] **Step 5: Verificar click en clase existente**

Click en una tarjeta de clase (fuera de los links "Editar"/"Cancelar"): navega a `/classes/:id` (detalle/reservaciones), igual que el comportamiento anterior de la tabla.

- [ ] **Step 6: Crear una sola clase (caso simple, compatibilidad hacia atras)**

Click "Nueva clase". Dejar marcado solo el día actual (default), semanas=1, completar título/instructor/hora inicio/hora fin/cupo. Guardar. Confirmar: se crea 1 clase, aparece en la columna del día correspondiente de la semana visible, el modal cierra solo (sin aviso de salteadas).

- [ ] **Step 7: Crear en lote**

Click "Nueva clase". Marcar 3 días (ej. Lunes, Miércoles, Viernes), semanas=4, hora 06:00-07:00, instructor y cupo. Guardar. Confirmar: se crean hasta 12 clases; navegar semana a semana con `WeekSelector` y verificar que aparecen en los días/semanas correctos.

- [ ] **Step 8: Verificar salteo por conflicto**

Repetir la creación anterior con el mismo día/hora que ya tiene una clase (de la Step 7). Confirmar: el modal no cierra solo, muestra el aviso amarillo "Se saltearon N clase(s)..." con el detalle de fecha/hora, y las clases sin conflicto sí se crean (verificar en la grilla).

- [ ] **Step 9: Verificar edición sigue igual**

Click "Editar" en una clase existente: abre el modal en modo edición (campos inicio/fin de fecha-hora completa, sin checkboxes de días). Cambiar el título, guardar. Confirmar: se actualiza esa única clase, sin afectar otras.

- [ ] **Step 10: Verificar cancelar sigue igual**

Click "Cancelar" en una clase `SCHEDULED`: pide confirmación del navegador, al aceptar la clase deja de aparecer en la grilla (o cambia de estado, según filtro).

- [ ] **Step 11: Commit final si hubo fixes**

Si algún paso anterior requirió un ajuste de código, commitear ese fix por separado con mensaje descriptivo antes de cerrar la rama. Si todo pasó sin cambios, no hay commit en este paso.

---

## Self-Review

**Spec coverage:** los 6 puntos de "Incluye" del spec están cubiertos — grid 7 columnas (Task 6), `WeekSelector` (Task 2), filtro solo instructor (Task 7), click a detalle + Editar/Cancelar preservado (Task 6), selector de días + repetir N semanas en creación (Task 5), validación de disponibilidad con salteo + aviso (Task 3, 5). Los puntos de "No incluye" se respetan: sin tabla de recurrencia en BD, sin chequeo por instructor especifico (choque es por horario exacto via `rangesOverlap` sin filtrar por `instructor_id`), sin toggle tabla/grid, boton "Nueva clase" sin cambios de posicion/texto/handler.

**Placeholder scan:** sin TBD/TODO, todo el codigo de cada task es completo y pegable.

**Type consistency:** `CreateClassesInput`/`CreateClassesResult` definidos en Task 3, usados con la misma forma en Task 4 (`useClasses.create`), Task 5 (`ClassFormModal` props `onCreate`), Task 8 (paso directo `onCreate={create}`). `UpdateClassInput` definido igual en Task 4 y Task 5 (duplicado deliberado, mismo patron que el resto del proyecto no comparte tipos de input entre hook y componente via un archivo aparte). `formatDateKey`/`getWeekDays`/`getWeekStart` de Task 1 se importan con esos nombres exactos en Task 2, 5, 6 y 8.
