import { useEffect, useState, type FormEvent } from "react";
import { z } from "zod";
import type { Instructor } from "@/features/instructors/types/Instructor";
import { getErrorMessage } from "@/utils/getErrorMessage";
import type { AcademyGroupWithDetails, GroupInput, GroupScheduleInput } from "../types/AcademyGroup";

const DAY_LABELS = ["Domingo", "Lunes", "Martes", "Miercoles", "Jueves", "Viernes", "Sabado"];

const scheduleSchema = z
  .object({
    dayOfWeek: z.coerce.number().int().min(0).max(6),
    startTime: z.string().min(1, "Hora de inicio obligatoria"),
    endTime: z.string().min(1, "Hora de fin obligatoria"),
  })
  .refine((value) => value.endTime > value.startTime, {
    message: "La hora de fin debe ser despues de la hora de inicio",
    path: ["endTime"],
  });

const schema = z.object({
  name: z.string().min(1, "El nombre es obligatorio"),
  instructorId: z.string(),
  schedules: z.array(scheduleSchema),
});

type Props = {
  open: boolean;
  initialValue: AcademyGroupWithDetails | null;
  instructors: Instructor[];
  onClose: () => void;
  onSubmit: (input: GroupInput) => Promise<void>;
};

export function AcademyGroupFormModal({ open, initialValue, instructors, onClose, onSubmit }: Props) {
  const [name, setName] = useState("");
  const [instructorId, setInstructorId] = useState("");
  const [schedules, setSchedules] = useState<GroupScheduleInput[]>([]);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName(initialValue?.name ?? "");
    setInstructorId(initialValue?.instructorId ?? "");
    setSchedules(
      initialValue
        ? initialValue.schedules.map((s) => ({
            dayOfWeek: s.dayOfWeek,
            startTime: s.startTime.slice(0, 5),
            endTime: s.endTime.slice(0, 5),
          }))
        : [],
    );
    setFieldErrors({});
    setFormError(null);
  }, [open, initialValue]);

  useEffect(() => {
    if (!open) return;
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  function addSchedule() {
    setSchedules((prev) => [...prev, { dayOfWeek: 1, startTime: "", endTime: "" }]);
  }

  function removeSchedule(index: number) {
    setSchedules((prev) => prev.filter((_, i) => i !== index));
  }

  function updateSchedule(index: number, patch: Partial<GroupScheduleInput>) {
    setSchedules((prev) => prev.map((s, i) => (i === index ? { ...s, ...patch } : s)));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);

    const result = schema.safeParse({ name, instructorId, schedules });
    if (!result.success) {
      const errors: Record<string, string> = {};
      for (const issue of result.error.issues) {
        errors[issue.path.join(".")] = issue.message;
      }
      setFieldErrors(errors);
      return;
    }
    setFieldErrors({});

    setIsSaving(true);
    try {
      await onSubmit({
        name: result.data.name,
        instructorId: result.data.instructorId ? result.data.instructorId : null,
        schedules: result.data.schedules,
      });
      onClose();
    } catch (err) {
      setFormError(getErrorMessage(err, "No se pudo guardar el grupo."));
      console.error("[academy] guardar grupo fallo", err);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/40 p-4">
      <form
        id="academy-group-form-modal"
        onSubmit={handleSubmit}
        noValidate
        className="flex w-full max-w-lg flex-col gap-3 rounded-lg bg-white p-6"
      >
        <h2 className="text-lg font-semibold text-brand-primary">
          {initialValue ? "Editar grupo" : "Nuevo grupo"}
        </h2>

        <div className="flex flex-col gap-1">
          <input
            id="academy-group-name-input"
            type="text"
            placeholder="Nombre del grupo"
            value={name}
            onChange={(event) => setName(event.target.value)}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
          {fieldErrors.name && <p className="text-xs text-red-600">{fieldErrors.name}</p>}
        </div>

        <select
          id="academy-group-instructor-select"
          value={instructorId}
          onChange={(event) => setInstructorId(event.target.value)}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm"
        >
          <option value="">Sin instructor asignado</option>
          {instructors.map((instructor) => (
            <option key={instructor.id} value={instructor.id}>
              {instructor.fullName}
            </option>
          ))}
        </select>

        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500">Horario semanal</span>
            <button
              type="button"
              onClick={addSchedule}
              className="text-xs text-brand-primary hover:underline"
            >
              Agregar horario
            </button>
          </div>
          {schedules.map((schedule, index) => (
            <div key={index} className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <select
                  value={schedule.dayOfWeek}
                  onChange={(event) => updateSchedule(index, { dayOfWeek: Number(event.target.value) })}
                  className="rounded-md border border-gray-300 px-2 py-1 text-sm"
                >
                  {DAY_LABELS.map((label, dayIndex) => (
                    <option key={dayIndex} value={dayIndex}>
                      {label}
                    </option>
                  ))}
                </select>
                <input
                  type="time"
                  value={schedule.startTime}
                  onChange={(event) => updateSchedule(index, { startTime: event.target.value })}
                  className="rounded-md border border-gray-300 px-2 py-1 text-sm"
                />
                <span className="text-xs text-gray-500">a</span>
                <input
                  type="time"
                  value={schedule.endTime}
                  onChange={(event) => updateSchedule(index, { endTime: event.target.value })}
                  className="rounded-md border border-gray-300 px-2 py-1 text-sm"
                />
                <button
                  type="button"
                  onClick={() => removeSchedule(index)}
                  className="text-xs text-gray-500 hover:underline"
                >
                  Quitar
                </button>
              </div>
              {fieldErrors[`schedules.${index}.endTime`] && (
                <p className="text-xs text-red-600">{fieldErrors[`schedules.${index}.endTime`]}</p>
              )}
            </div>
          ))}
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
