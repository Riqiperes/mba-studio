import { useEffect, useState } from "react";
import { useAuth } from "@/features/auth/hooks/AuthProvider";
import { useMyDependents } from "@/features/dependents/hooks/useMyDependents";
import { useScheduleTrialClass } from "@/features/academy/hooks/useScheduleTrialClass";
import { CircleAlert } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { ModalDialog } from "@/components/ui/ModalDialog";
import { SelectField } from "@/components/ui/SelectField";
import { getErrorMessage } from "@/utils/getErrorMessage";
import type { AcademyGroupCatalogItem } from "../types/AcademyGroup";

const DAY_NAMES = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];

function toLocalISODate(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function nextOccurrenceOf(dayOfWeek: number): string {
  const today = new Date();
  const diff = (dayOfWeek - today.getDay() + 7) % 7;
  const date = new Date(today);
  date.setDate(today.getDate() + diff);
  return toLocalISODate(date);
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
    <ModalDialog
      id="trial-class-modal"
      open={open}
      onClose={onClose}
      title={`Clase muestra — ${group.name}`}
      description="Sin costo. El staff confirmará tu lugar."
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button variant="primary" onClick={handleSubmit} disabled={submitting} loading={submitting}>
            Agendar clase muestra
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <SelectField
          id="trial-dependent-select"
          label="Alumno"
          value={dependentId}
          onChange={(event) => setDependentId(event.target.value)}
          disabled={dependentsLoading}
          hint={
            dependents.length === 0 && !dependentsLoading
              ? 'Primero agrega un alumno desde "Inscribir y pagar inscripción".'
              : undefined
          }
        >
          <option value="">Elige un alumno</option>
          {dependents.map((dependent) => (
            <option key={dependent.id} value={dependent.id}>
              {dependent.fullName}
            </option>
          ))}
        </SelectField>

        <SelectField
          id="trial-schedule-select"
          label="Horario"
          value={scheduleId}
          onChange={(event) => setScheduleId(event.target.value)}
          hint={trialDate ? `Fecha propuesta: ${trialDate}` : undefined}
        >
          {group.schedules.map((schedule) => (
            <option key={schedule.id} value={schedule.id}>
              {DAY_NAMES[schedule.dayOfWeek]} {schedule.startTime.slice(0, 5)}–{schedule.endTime.slice(0, 5)}
            </option>
          ))}
        </SelectField>

        {formError && (
          <p role="alert" className="flex items-start gap-2 text-pequeno text-alerta">
            <CircleAlert className="mt-px h-4 w-4 shrink-0" strokeWidth={1.8} aria-hidden="true" />
            {formError}
          </p>
        )}
      </div>
    </ModalDialog>
  );
}
