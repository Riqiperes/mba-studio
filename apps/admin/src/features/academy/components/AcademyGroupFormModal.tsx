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

const schema = z
  .object({
    name: z.string().min(1, "El nombre es obligatorio"),
    instructorId: z.string(),
    ageMin: z.string(),
    ageMax: z.string(),
    maxCapacity: z.coerce.number().int().min(1, "El cupo debe ser al menos 1").max(15, "El cupo maximo es 15"),
    monthlyTuition: z.coerce.number().positive("La colegiatura debe ser mayor a 0"),
    schedules: z.array(scheduleSchema),
  })
  .refine(
    (value) => value.ageMin === "" || value.ageMax === "" || Number(value.ageMax) >= Number(value.ageMin),
    { message: "La edad maxima debe ser mayor o igual a la minima", path: ["ageMax"] },
  );

type Props = {
  open: boolean;
  initialValue: AcademyGroupWithDetails | null;
  initialMonthlyTuitionCents: number | null;
  instructors: Instructor[];
  onClose: () => void;
  onSubmit: (input: GroupInput) => Promise<void>;
};

export function AcademyGroupFormModal({
  open,
  initialValue,
  initialMonthlyTuitionCents,
  instructors,
  onClose,
  onSubmit,
}: Props) {
  const [name, setName] = useState("");
  const [instructorId, setInstructorId] = useState("");
  const [ageMin, setAgeMin] = useState("");
  const [ageMax, setAgeMax] = useState("");
  const [maxCapacity, setMaxCapacity] = useState("15");
  const [monthlyTuition, setMonthlyTuition] = useState("");
  const [schedules, setSchedules] = useState<GroupScheduleInput[]>([]);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName(initialValue?.name ?? "");
    setInstructorId(initialValue?.instructorId ?? "");
    setAgeMin(initialValue?.ageMin != null ? String(initialValue.ageMin) : "");
    setAgeMax(initialValue?.ageMax != null ? String(initialValue.ageMax) : "");
    setMaxCapacity(initialValue ? String(initialValue.maxCapacity) : "15");
    setMonthlyTuition(
      initialMonthlyTuitionCents != null ? String(initialMonthlyTuitionCents / 100) : "",
    );
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
  }, [open, initialValue, initialMonthlyTuitionCents]);

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

    const result = schema.safeParse({
      name,
      instructorId,
      ageMin,
      ageMax,
      maxCapacity,
      monthlyTuition,
      schedules,
    });
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
        ageMin: result.data.ageMin === "" ? null : Number(result.data.ageMin),
        ageMax: result.data.ageMax === "" ? null : Number(result.data.ageMax),
        maxCapacity: result.data.maxCapacity,
        monthlyTuitionCents: Math.round(result.data.monthlyTuition * 100),
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
    <div className="fixed inset-0 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <form
        id="academy-group-form-modal"
        onSubmit={handleSubmit}
        onClick={(event) => event.stopPropagation()}
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

        <div className="grid grid-cols-4 gap-2">
          <div className="flex flex-col gap-1">
            <label htmlFor="academy-group-age-min-input" className="text-xs text-gray-500">
              Edad minima
            </label>
            <input
              id="academy-group-age-min-input"
              type="number"
              min={0}
              placeholder="Sin limite"
              value={ageMin}
              onChange={(event) => setAgeMin(event.target.value)}
              className="rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="academy-group-age-max-input" className="text-xs text-gray-500">
              Edad maxima
            </label>
            <input
              id="academy-group-age-max-input"
              type="number"
              min={0}
              placeholder="Sin limite"
              value={ageMax}
              onChange={(event) => setAgeMax(event.target.value)}
              className="rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
            {fieldErrors.ageMax && <p className="text-xs text-red-600">{fieldErrors.ageMax}</p>}
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="academy-group-max-capacity-input" className="text-xs text-gray-500">
              Cupo maximo
            </label>
            <input
              id="academy-group-max-capacity-input"
              type="number"
              min={1}
              max={15}
              value={maxCapacity}
              onChange={(event) => setMaxCapacity(event.target.value)}
              className="rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
            {fieldErrors.maxCapacity && <p className="text-xs text-red-600">{fieldErrors.maxCapacity}</p>}
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="academy-group-monthly-tuition-input" className="text-xs text-gray-500">
              Colegiatura (MXN)
            </label>
            <input
              id="academy-group-monthly-tuition-input"
              type="number"
              min={0}
              step="0.01"
              value={monthlyTuition}
              onChange={(event) => setMonthlyTuition(event.target.value)}
              className="rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
            {fieldErrors.monthlyTuition && (
              <p className="text-xs text-red-600">{fieldErrors.monthlyTuition}</p>
            )}
          </div>
        </div>
        <p className="-mt-1 text-xs text-gray-400">
          Se cobra el dia 10 de cada mes (fecha fija, no configurable por grupo).
        </p>

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
