import { useEffect, useState, type FormEvent } from "react";
import { useAuth } from "@/features/auth/hooks/AuthProvider";
import { useMyDependents } from "@/features/dependents/hooks/useMyDependents";
import { useEnrollDependent } from "@/features/academy/hooks/useEnrollDependent";
import { CircleAlert, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { ModalDialog } from "@/components/ui/ModalDialog";
import { SelectField } from "@/components/ui/SelectField";
import { TextField } from "@/components/ui/TextField";
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
    // ponytail: deps intentionally [open] only -- including dependents.length
    // re-fires this effect right after creating an alumno inline (create()
    // reloads the list), wiping the just-selected dependentId.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

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
    <ModalDialog
      id="enroll-and-pay-modal"
      open={open}
      onClose={onClose}
      title={`Inscribir a ${groupName}`}
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            variant="primary"
            onClick={handleSubmit}
            disabled={submitting || !dependentId || showNewStudentForm}
            loading={submitting}
          >
            Pagar inscripción e inscribir
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <p className="rounded-control bg-suave p-3 text-pequeno text-texto-suave text-pretty">
          Tu solicitud queda pendiente de aprobación por el staff. La cuota de inscripción es de{" "}
          <span className="font-medium text-texto">{formatCents(registrationFeeCents)}</span>.{" "}
          <strong className="font-medium text-texto">Este es un pago de prueba</strong>, todavía no procesamos cobros
          reales — el staff confirmará el pago cuando revise tu solicitud.
        </p>

        {dependentsLoading ? (
          <p role="status" className="text-pequeno text-texto-suave">
            Cargando tus alumnos…
          </p>
        ) : !showNewStudentForm ? (
          <div className="flex flex-col gap-2">
            <SelectField
              id="enroll-dependent-select"
              label="Alumno"
              value={dependentId}
              onChange={(event) => setDependentId(event.target.value)}
            >
              <option value="">Elige un alumno</option>
              {dependents.map((dependent) => (
                <option key={dependent.id} value={dependent.id}>
                  {dependent.fullName}
                </option>
              ))}
            </SelectField>
            <Button variant="ghost" size="sm" className="self-start" onClick={() => setShowNewStudentForm(true)}>
              <UserPlus className="h-4 w-4" strokeWidth={1.6} aria-hidden="true" />
              Agregar alumno nuevo
            </Button>
          </div>
        ) : (
          <form
            id="enroll-new-student-form"
            onSubmit={handleCreateStudent}
            noValidate
            className="flex flex-col gap-3 rounded-card border border-borde p-4"
          >
            <TextField
              id="enroll-new-student-name-input"
              label="Nombre completo del alumno"
              type="text"
              autoComplete="off"
              value={newStudentName}
              onChange={(event) => setNewStudentName(event.target.value)}
            />
            <TextField
              id="enroll-new-student-birthdate-input"
              label="Fecha de nacimiento (opcional)"
              type="date"
              value={newStudentBirthDate}
              onChange={(event) => setNewStudentBirthDate(event.target.value)}
            />
            <div className="flex justify-end gap-2">
              {dependents.length > 0 && (
                <Button type="button" variant="ghost" size="sm" onClick={() => setShowNewStudentForm(false)}>
                  Cancelar
                </Button>
              )}
              <Button type="submit" variant="soft" size="sm" loading={creatingStudent}>
                {creatingStudent ? "Creando…" : "Crear alumno"}
              </Button>
            </div>
          </form>
        )}

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
