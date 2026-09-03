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
    maxCapacity: z.coerce
      .number()
      .int("El cupo debe ser un numero entero")
      .positive("El cupo debe ser mayor a 0"),
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
  // Si se edita una clase cuyo instructor ya fue desactivado, el <select>
  // controlado necesita esa opcion presente o queda mostrando el
  // placeholder aunque el estado siga con el id real (la clase conserva
  // su instructor original al guardar, esto es solo para que el select
  // no mienta visualmente).
  const selectableInstructors =
    initialValue && !activeInstructors.some((i) => i.id === initialValue.instructorId)
      ? [
          ...activeInstructors,
          ...instructors.filter((i) => i.id === initialValue.instructorId),
        ]
      : activeInstructors;

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

  useEffect(() => {
    if (!open) return;
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

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
