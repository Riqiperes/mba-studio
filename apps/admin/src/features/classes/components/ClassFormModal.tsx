// apps/admin/src/features/classes/components/ClassFormModal.tsx
import { useEffect, useState, type FormEvent } from "react";
import { z } from "zod";
import type { Instructor } from "@/features/instructors/types/Instructor";
import { getErrorMessage } from "@/utils/getErrorMessage";
import type {
  CreateClassesInput,
  CreateClassesResult,
  StudioClass,
  UpdateClassInput,
} from "../types/StudioClass";
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
  const [createdCount, setCreatedCount] = useState(0);
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
    setCreatedCount(0);
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
        setCreatedCount(created.created.length);
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
            <p className="font-medium">
              Se crearon {createdCount} de {createdCount + skipped.length}. Se saltearon por conflicto de horario:
            </p>
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
