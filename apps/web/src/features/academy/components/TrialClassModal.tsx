import { useEffect, useState } from "react";
import { useAuth } from "@/features/auth/hooks/AuthProvider";
import { useMyDependents } from "@/features/dependents/hooks/useMyDependents";
import { useScheduleTrialClass } from "@/features/academy/hooks/useScheduleTrialClass";
import { Button } from "@/components/ui/Button";
import { getErrorMessage } from "@/utils/getErrorMessage";
import type { AcademyGroupCatalogItem } from "../types/AcademyGroup";

const DAY_NAMES = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];

function nextOccurrenceOf(dayOfWeek: number): string {
  const today = new Date();
  const diff = (dayOfWeek - today.getDay() + 7) % 7;
  const date = new Date(today);
  date.setDate(today.getDate() + diff);
  return date.toISOString().slice(0, 10);
}

type Props = {
  open: boolean;
  group: AcademyGroupCatalogItem;
  onClose: () => void;
  onSuccess: () => void;
};

export function TrialClassModal({ open, group, onClose, onSuccess }: Props) {
  const { profile } = useAuth();
  const { dependents, loading: dependentsLoading } = useMyDependents();
  const { submitting, scheduleTrial } = useScheduleTrialClass();

  const [dependentId, setDependentId] = useState("");
  const [scheduleId, setScheduleId] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setDependentId("");
    setScheduleId(group.schedules[0]?.id ?? "");
    setFormError(null);
  }, [open, group.schedules]);

  if (!open) return null;

  const selectedSchedule = group.schedules.find((s) => s.id === scheduleId);
  const trialDate = selectedSchedule ? nextOccurrenceOf(selectedSchedule.dayOfWeek) : null;

  async function handleSubmit() {
    if (!profile?.businessId) {
      setFormError("Falta el negocio del cliente.");
      return;
    }
    if (!dependentId) {
      setFormError("Elige un alumno.");
      return;
    }
    if (!scheduleId || !trialDate) {
      setFormError("Elige un horario.");
      return;
    }
    setFormError(null);
    try {
      await scheduleTrial(profile.businessId, dependentId, group.id, scheduleId, trialDate);
      onSuccess();
      onClose();
    } catch (err) {
      setFormError(getErrorMessage(err, "No se pudo agendar la clase muestra."));
    }
  }

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        id="trial-class-modal"
        className="flex w-full max-w-md flex-col gap-3 rounded-lg bg-white p-6"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 className="text-lg font-semibold text-brand-primary">Clase muestra — {group.name}</h2>
        <p className="text-sm text-gray-600">Sin costo. El staff confirmará tu lugar.</p>

        <div className="flex flex-col gap-1">
          <label htmlFor="trial-dependent-select" className="text-xs text-gray-500">
            Alumno
          </label>
          <select
            id="trial-dependent-select"
            value={dependentId}
            onChange={(event) => setDependentId(event.target.value)}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm"
            disabled={dependentsLoading}
          >
            <option value="">Elige un alumno</option>
            {dependents.map((dependent) => (
              <option key={dependent.id} value={dependent.id}>
                {dependent.fullName}
              </option>
            ))}
          </select>
          {dependents.length === 0 && !dependentsLoading && (
            <p className="text-xs text-gray-500">
              Primero agrega un alumno desde "Inscribir y pagar inscripción".
            </p>
          )}
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="trial-schedule-select" className="text-xs text-gray-500">
            Horario
          </label>
          <select
            id="trial-schedule-select"
            value={scheduleId}
            onChange={(event) => setScheduleId(event.target.value)}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm"
          >
            {group.schedules.map((schedule) => (
              <option key={schedule.id} value={schedule.id}>
                {DAY_NAMES[schedule.dayOfWeek]} {schedule.startTime.slice(0, 5)}-{schedule.endTime.slice(0, 5)}
              </option>
            ))}
          </select>
          {trialDate && <p className="text-xs text-gray-500">Fecha propuesta: {trialDate}</p>}
        </div>

        {formError && <p className="text-sm text-red-600">{formError}</p>}

        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-gray-600">
            Cancelar
          </button>
          <Button variant="primary" onClick={handleSubmit} disabled={submitting} loading={submitting}>
            Agendar clase muestra
          </Button>
        </div>
      </div>
    </div>
  );
}
