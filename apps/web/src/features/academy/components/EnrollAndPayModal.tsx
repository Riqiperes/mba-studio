import { useEffect, useState, type FormEvent } from "react";
import { useAuth } from "@/features/auth/hooks/AuthProvider";
import { useMyDependents } from "@/features/dependents/hooks/useMyDependents";
import { useEnrollDependent } from "@/features/academy/hooks/useEnrollDependent";
import { Button } from "@/components/ui/Button";
import { getErrorMessage } from "@/utils/getErrorMessage";

function formatCents(cents: number | null): string {
  if (cents == null) return "monto por confirmar";
  return `$${(cents / 100).toFixed(2)} MXN`;
}

type Props = {
  open: boolean;
  groupId: string;
  groupName: string;
  registrationFeeCents: number | null;
  onClose: () => void;
  onSuccess: () => void;
};

export function EnrollAndPayModal({
  open,
  groupId,
  groupName,
  registrationFeeCents,
  onClose,
  onSuccess,
}: Props) {
  const { profile } = useAuth();
  const { dependents, loading: dependentsLoading, create } = useMyDependents();
  const { submitting, enroll } = useEnrollDependent();

  const [dependentId, setDependentId] = useState("");
  const [showNewStudentForm, setShowNewStudentForm] = useState(false);
  const [newStudentName, setNewStudentName] = useState("");
  const [newStudentBirthDate, setNewStudentBirthDate] = useState("");
  const [creatingStudent, setCreatingStudent] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setDependentId("");
    setShowNewStudentForm(dependents.length === 0);
    setNewStudentName("");
    setNewStudentBirthDate("");
    setFormError(null);
  }, [open, dependents.length]);

  if (!open) return null;

  async function handleCreateStudent(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!newStudentName.trim()) {
      setFormError("El nombre del alumno es obligatorio.");
      return;
    }
    setFormError(null);
    setCreatingStudent(true);
    try {
      const created = await create({
        fullName: newStudentName.trim(),
        birthDate: newStudentBirthDate || null,
      });
      setDependentId(created.id);
      setShowNewStudentForm(false);
    } catch (err) {
      setFormError(getErrorMessage(err, "No se pudo crear el alumno."));
      console.error("[academy] crear alumno fallo", err);
    } finally {
      setCreatingStudent(false);
    }
  }

  async function handleSubmit() {
    if (!profile?.businessId) {
      setFormError("Falta el negocio del cliente.");
      return;
    }
    if (!dependentId) {
      setFormError("Elige un alumno.");
      return;
    }
    setFormError(null);
    try {
      await enroll(profile.businessId, dependentId, groupId);
      onSuccess();
      onClose();
    } catch (err) {
      setFormError(getErrorMessage(err, "No se pudo enviar la solicitud."));
    }
  }

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        id="enroll-and-pay-modal"
        className="flex w-full max-w-md flex-col gap-3 rounded-lg bg-white p-6"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 className="text-lg font-semibold text-brand-primary">Inscribir a {groupName}</h2>
        <p className="text-sm text-gray-600">
          Tu solicitud queda pendiente de aprobación por el staff. La cuota de inscripción es de{" "}
          {formatCents(registrationFeeCents)}. <strong>Este es un pago de prueba</strong>, todavía no
          procesamos cobros reales — el staff confirmará el pago cuando revise tu solicitud.
        </p>

        {dependentsLoading ? (
          <p className="text-sm text-gray-500">Cargando tus alumnos...</p>
        ) : !showNewStudentForm ? (
          <div className="flex flex-col gap-1">
            <label htmlFor="enroll-dependent-select" className="text-xs text-gray-500">
              Alumno
            </label>
            <select
              id="enroll-dependent-select"
              value={dependentId}
              onChange={(event) => setDependentId(event.target.value)}
              className="rounded-md border border-gray-300 px-3 py-2 text-sm"
            >
              <option value="">Elige un alumno</option>
              {dependents.map((dependent) => (
                <option key={dependent.id} value={dependent.id}>
                  {dependent.fullName}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => setShowNewStudentForm(true)}
              className="self-start text-xs text-brand-primary hover:underline"
            >
              Agregar alumno nuevo
            </button>
          </div>
        ) : (
          <form
            id="enroll-new-student-form"
            onSubmit={handleCreateStudent}
            noValidate
            className="flex flex-col gap-2 rounded-md border border-gray-200 p-3"
          >
            <input
              id="enroll-new-student-name-input"
              type="text"
              placeholder="Nombre completo del alumno"
              value={newStudentName}
              onChange={(event) => setNewStudentName(event.target.value)}
              className="rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
            <input
              id="enroll-new-student-birthdate-input"
              type="date"
              value={newStudentBirthDate}
              onChange={(event) => setNewStudentBirthDate(event.target.value)}
              className="rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
            <div className="flex justify-end gap-2">
              {dependents.length > 0 && (
                <button
                  type="button"
                  onClick={() => setShowNewStudentForm(false)}
                  className="px-3 py-1 text-xs text-gray-600"
                >
                  Cancelar
                </button>
              )}
              <button
                type="submit"
                disabled={creatingStudent}
                className="rounded-md bg-brand-primary px-3 py-1 text-xs font-medium text-white hover:opacity-90 disabled:opacity-50"
              >
                {creatingStudent ? "Creando..." : "Crear alumno"}
              </button>
            </div>
          </form>
        )}

        {formError && <p className="text-sm text-red-600">{formError}</p>}

        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-gray-600">
            Cancelar
          </button>
          <Button
            variant="primary"
            onClick={handleSubmit}
            disabled={submitting || !dependentId || showNewStudentForm}
            loading={submitting}
          >
            Pagar inscripción e inscribir
          </Button>
        </div>
      </div>
    </div>
  );
}
