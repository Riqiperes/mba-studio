import { useEffect, useState, type FormEvent } from "react";
import { z } from "zod";
import type { Instructor } from "@/features/instructors/types/Instructor";
import { getErrorMessage } from "@/utils/getErrorMessage";
import type { AcademyGroupWithDetails, GroupInput, GroupScheduleInput } from "../types/AcademyGroup";
import { buttonClasses } from "@/components/ui/buttonStyles";
import { ModalShell } from "@/components/ui/ModalShell";

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
    <ModalShell onClose={onClose} size="lg" bodyClassName="">
      <form
        id="academy-group-form-modal"
        onSubmit={handleSubmit}
        noValidate
        className="flex flex-col gap-3"
      >
        <h2 className="font-display text-subtitulo font-medium text-texto">
          {initialValue ? "Editar grupo" : "Nuevo grupo"}
        </h2>

        <div className="flex flex-col gap-1">
          <input
            id="academy-group-name-input"
            type="text"
            placeholder="Nombre del grupo"
            value={name}
            onChange={(event) => setName(event.target.value)}
            className="campo"
          />
          {fieldErrors.name && <p role="alert" className="flex items-start gap-2 rounded-control bg-suave px-3 py-2 text-pequeno text-alerta">{fieldErrors.name}</p>}
        </div>

        <select
          id="academy-group-instructor-select"
          value={instructorId}
          onChange={(event) => setInstructorId(event.target.value)}
          className="campo"
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
            <label htmlFor="academy-group-age-min-input" className="etiqueta-campo">
              Edad minima
            </label>
            <input
              id="academy-group-age-min-input"
              type="number"
              min={0}
              placeholder="Sin limite"
              value={ageMin}
              onChange={(event) => setAgeMin(event.target.value)}
              className="campo"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="academy-group-age-max-input" className="etiqueta-campo">
              Edad maxima
            </label>
            <input
              id="academy-group-age-max-input"
              type="number"
              min={0}
              placeholder="Sin limite"
              value={ageMax}
              onChange={(event) => setAgeMax(event.target.value)}
              className="campo"
            />
            {fieldErrors.ageMax && <p role="alert" className="flex items-start gap-2 rounded-control bg-suave px-3 py-2 text-pequeno text-alerta">{fieldErrors.ageMax}</p>}
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="academy-group-max-capacity-input" className="etiqueta-campo">
              Cupo maximo
            </label>
            <input
              id="academy-group-max-capacity-input"
              type="number"
              min={1}
              max={15}
              value={maxCapacity}
              onChange={(event) => setMaxCapacity(event.target.value)}
              className="campo"
            />
            {fieldErrors.maxCapacity && <p role="alert" className="flex items-start gap-2 rounded-control bg-suave px-3 py-2 text-pequeno text-alerta">{fieldErrors.maxCapacity}</p>}
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="academy-group-monthly-tuition-input" className="etiqueta-campo">
              Colegiatura (MXN)
            </label>
            <input
              id="academy-group-monthly-tuition-input"
              type="number"
              min={0}
              step="0.01"
              value={monthlyTuition}
              onChange={(event) => setMonthlyTuition(event.target.value)}
              className="campo"
            />
            {fieldErrors.monthlyTuition && (
              <p role="alert" className="flex items-start gap-2 rounded-control bg-suave px-3 py-2 text-pequeno text-alerta">{fieldErrors.monthlyTuition}</p>
            )}
          </div>
        </div>
        <p className="-mt-1 text-pequeno text-texto-suave">
          Se cobra el dia 10 de cada mes (fecha fija, no configurable por grupo).
        </p>

        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-pequeno text-texto-suave">Horario semanal</span>
            <button
              type="button"
              onClick={addSchedule}
              className="accion text-acento"
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
                  className="campo campo-compacto"
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
                  className="campo campo-compacto"
                />
                <span className="text-pequeno text-texto-suave">a</span>
                <input
                  type="time"
                  value={schedule.endTime}
                  onChange={(event) => updateSchedule(index, { endTime: event.target.value })}
                  className="campo campo-compacto"
                />
                <button
                  type="button"
                  onClick={() => removeSchedule(index)}
                  className="accion text-texto-suave"
                >
                  Quitar
                </button>
              </div>
              {fieldErrors[`schedules.${index}.endTime`] && (
                <p role="alert" className="flex items-start gap-2 rounded-control bg-suave px-3 py-2 text-pequeno text-alerta">{fieldErrors[`schedules.${index}.endTime`]}</p>
              )}
            </div>
          ))}
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className={buttonClasses("ghost", "md")}>
            Cancelar
          </button>
          <button
            type="submit"
            disabled={isSaving}
            className={buttonClasses("primary", "md")}
          >
            {isSaving ? "Guardando..." : "Guardar"}
          </button>
        </div>

        {formError && <p role="alert" className="flex items-start gap-2 rounded-control bg-suave px-3 py-2 text-pequeno text-alerta">{formError}</p>}
      </form>
    </ModalShell>
  );
}
