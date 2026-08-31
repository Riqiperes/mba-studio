import { useEffect, useState, type FormEvent } from "react";
import { z } from "zod";
import type { Customer } from "@/features/customers/types/Customer";
import { useDependentsByGuardian } from "@/features/dependents/hooks/useDependents";
import { createDependent } from "@/features/dependents/services/dependentsService";
import { getErrorMessage } from "@/utils/getErrorMessage";

const newRegisteredStudentSchema = z.object({
  fullName: z.string().min(1, "El nombre es obligatorio"),
  birthDate: z
    .string()
    .refine((value) => value === "" || !isNaN(Date.parse(value)), {
      message: "Fecha de nacimiento invalida",
    })
    .refine((value) => value === "" || new Date(value) <= new Date(), {
      message: "La fecha de nacimiento no puede ser futura",
    }),
});

const unregisteredGuardianSchema = z.object({
  guardianName: z.string().min(1, "El nombre del tutor es obligatorio"),
  guardianPhone: z.string(),
  studentName: z.string().min(1, "El nombre del alumno es obligatorio"),
  birthDate: z
    .string()
    .refine((value) => value === "" || !isNaN(Date.parse(value)), {
      message: "Fecha de nacimiento invalida",
    })
    .refine((value) => value === "" || new Date(value) <= new Date(), {
      message: "La fecha de nacimiento no puede ser futura",
    }),
  enrollmentDate: z.string().min(1, "Fecha de inscripcion obligatoria"),
});

type Props = {
  open: boolean;
  businessId: string;
  customers: Customer[];
  onClose: () => void;
  onSubmit: (dependentId: string, enrollmentDate: string) => Promise<void>;
};

export function EnrollStudentModal({ open, businessId, customers, onClose, onSubmit }: Props) {
  const [tab, setTab] = useState<"registered" | "unregistered">("registered");
  const [customerId, setCustomerId] = useState("");
  const [dependentId, setDependentId] = useState("");
  const [enrollmentDate, setEnrollmentDate] = useState("");
  const [showNewStudentForm, setShowNewStudentForm] = useState(false);
  const [newStudentName, setNewStudentName] = useState("");
  const [newStudentBirthDate, setNewStudentBirthDate] = useState("");

  // Campos para tutor de mostrador
  const [unregGuardianName, setUnregGuardianName] = useState("");
  const [unregGuardianPhone, setUnregGuardianPhone] = useState("");
  const [unregStudentName, setUnregStudentName] = useState("");
  const [unregStudentBirthDate, setUnregStudentBirthDate] = useState("");

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const customer = customers.find((c) => c.id === customerId);
  const { dependents, create: createRegisteredDependent } = useDependentsByGuardian(
    customerId,
    customer?.businessId ?? businessId,
  );

  useEffect(() => {
    if (!open) return;
    setTab("registered");
    setCustomerId("");
    setDependentId("");
    setEnrollmentDate(new Date().toISOString().slice(0, 10));
    setShowNewStudentForm(false);
    setNewStudentName("");
    setNewStudentBirthDate("");

    setUnregGuardianName("");
    setUnregGuardianPhone("");
    setUnregStudentName("");
    setUnregStudentBirthDate("");

    setFieldErrors({});
    setFormError(null);
  }, [open]);

  useEffect(() => {
    setDependentId("");
    setShowNewStudentForm(false);
    setFieldErrors({});
    setFormError(null);
  }, [customerId, tab]);

  useEffect(() => {
    if (!open) return;
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  async function handleCreateRegisteredStudent(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);

    const result = newRegisteredStudentSchema.safeParse({
      fullName: newStudentName,
      birthDate: newStudentBirthDate,
    });
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
      await createRegisteredDependent({
        fullName: result.data.fullName,
        birthDate: result.data.birthDate ? result.data.birthDate : null,
      });
      setShowNewStudentForm(false);
      setNewStudentName("");
      setNewStudentBirthDate("");
    } catch (err) {
      setFormError(getErrorMessage(err, "No se pudo crear el alumno."));
      console.error("[academy] crear alumno fallo", err);
    } finally {
      setIsSaving(false);
    }
  }

  async function handleSubmitRegistered() {
    setFormError(null);
    if (!dependentId) {
      setFormError("Elige un alumno");
      return;
    }

    setIsSaving(true);
    try {
      await onSubmit(dependentId, enrollmentDate);
      onClose();
    } catch (err) {
      setFormError(getErrorMessage(err, "No se pudo inscribir al alumno."));
      console.error("[academy] inscribir fallo", err);
    } finally {
      setIsSaving(false);
    }
  }

  async function handleSubmitUnregistered(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);

    const result = unregisteredGuardianSchema.safeParse({
      guardianName: unregGuardianName,
      guardianPhone: unregGuardianPhone,
      studentName: unregStudentName,
      birthDate: unregStudentBirthDate,
      enrollmentDate,
    });
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
      const createdStudent = await createDependent(businessId, {
        fullName: result.data.studentName,
        birthDate: result.data.birthDate ? result.data.birthDate : null,
        guardianName: result.data.guardianName,
        guardianPhone: result.data.guardianPhone ? result.data.guardianPhone : null,
      });
      await onSubmit(createdStudent.id, result.data.enrollmentDate);
      onClose();
    } catch (err) {
      setFormError(getErrorMessage(err, "No se pudo crear e inscribir al alumno de mostrador."));
      console.error("[academy] inscribir mostrador fallo", err);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/40 p-4">
      <div className="flex w-full max-w-md flex-col gap-3 rounded-lg bg-white p-6">
        <h2 className="text-lg font-semibold text-brand-primary">Inscribir alumno</h2>

        {/* Pestañas de modo */}
        <div className="flex border-b border-gray-200 text-sm">
          <button
            type="button"
            onClick={() => setTab("registered")}
            className={`border-b-2 px-3 py-2 font-medium ${
              tab === "registered"
                ? "border-brand-primary text-brand-primary"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            Cliente con cuenta
          </button>
          <button
            type="button"
            onClick={() => setTab("unregistered")}
            className={`border-b-2 px-3 py-2 font-medium ${
              tab === "unregistered"
                ? "border-brand-primary text-brand-primary"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            Tutor de mostrador (sin cuenta)
          </button>
        </div>

        {tab === "registered" ? (
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1">
              <label htmlFor="enroll-customer-select" className="text-xs text-gray-500">
                Cliente
              </label>
              <select
                id="enroll-customer-select"
                value={customerId}
                onChange={(event) => setCustomerId(event.target.value)}
                className="rounded-md border border-gray-300 px-3 py-2 text-sm"
              >
                <option value="">Elige un cliente</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.fullName ?? c.id}
                  </option>
                ))}
              </select>
            </div>

            {customerId && !showNewStudentForm && (
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
                  Crear alumno nuevo
                </button>
              </div>
            )}

            {customerId && showNewStudentForm && (
              <form
                id="enroll-new-student-form"
                onSubmit={handleCreateRegisteredStudent}
                noValidate
                className="flex flex-col gap-2 rounded-md border border-gray-200 p-3"
              >
                <div className="flex flex-col gap-1">
                  <input
                    id="enroll-new-student-name-input"
                    type="text"
                    placeholder="Nombre completo del alumno"
                    value={newStudentName}
                    onChange={(event) => setNewStudentName(event.target.value)}
                    className="rounded-md border border-gray-300 px-3 py-2 text-sm"
                  />
                  {fieldErrors.fullName && <p className="text-xs text-red-600">{fieldErrors.fullName}</p>}
                </div>
                <div className="flex flex-col gap-1">
                  <input
                    id="enroll-new-student-birthdate-input"
                    type="date"
                    value={newStudentBirthDate}
                    onChange={(event) => setNewStudentBirthDate(event.target.value)}
                    className="rounded-md border border-gray-300 px-3 py-2 text-sm"
                  />
                  {fieldErrors.birthDate && (
                    <p className="text-xs text-red-600">{fieldErrors.birthDate}</p>
                  )}
                </div>
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowNewStudentForm(false)}
                    className="px-3 py-1 text-xs text-gray-600"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="rounded-md bg-brand-primary px-3 py-1 text-xs font-medium text-white hover:opacity-90 disabled:opacity-50"
                  >
                    {isSaving ? "Creando..." : "Crear alumno"}
                  </button>
                </div>
              </form>
            )}

            <div className="flex flex-col gap-1">
              <label htmlFor="enroll-date-input" className="text-xs text-gray-500">
                Fecha de inscripcion
              </label>
              <input
                id="enroll-date-input"
                type="date"
                value={enrollmentDate}
                onChange={(event) => setEnrollmentDate(event.target.value)}
                className="rounded-md border border-gray-300 px-3 py-2 text-sm"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-gray-600">
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSubmitRegistered}
                disabled={isSaving || !dependentId}
                className="rounded-md bg-brand-primary px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
              >
                {isSaving ? "Inscribiendo..." : "Inscribir"}
              </button>
            </div>
          </div>
        ) : (
          <form
            id="enroll-unregistered-guardian-form"
            onSubmit={handleSubmitUnregistered}
            noValidate
            className="flex flex-col gap-3"
          >
            <div className="flex flex-col gap-1">
              <label htmlFor="unreg-guardian-name" className="text-xs text-gray-500">
                Nombre del tutor *
              </label>
              <input
                id="unreg-guardian-name"
                type="text"
                placeholder="Nombre del padre o tutor"
                value={unregGuardianName}
                onChange={(event) => setUnregGuardianName(event.target.value)}
                className="rounded-md border border-gray-300 px-3 py-2 text-sm"
              />
              {fieldErrors.guardianName && (
                <p className="text-xs text-red-600">{fieldErrors.guardianName}</p>
              )}
            </div>

            <div className="flex flex-col gap-1">
              <label htmlFor="unreg-guardian-phone" className="text-xs text-gray-500">
                Telefono del tutor (para WhatsApp)
              </label>
              <input
                id="unreg-guardian-phone"
                type="tel"
                placeholder="Ej. 9991234567"
                value={unregGuardianPhone}
                onChange={(event) => setUnregGuardianPhone(event.target.value)}
                className="rounded-md border border-gray-300 px-3 py-2 text-sm"
              />
              {fieldErrors.guardianPhone && (
                <p className="text-xs text-red-600">{fieldErrors.guardianPhone}</p>
              )}
            </div>

            <div className="flex flex-col gap-1">
              <label htmlFor="unreg-student-name" className="text-xs text-gray-500">
                Nombre del alumno *
              </label>
              <input
                id="unreg-student-name"
                type="text"
                placeholder="Nombre del alumno"
                value={unregStudentName}
                onChange={(event) => setUnregStudentName(event.target.value)}
                className="rounded-md border border-gray-300 px-3 py-2 text-sm"
              />
              {fieldErrors.studentName && (
                <p className="text-xs text-red-600">{fieldErrors.studentName}</p>
              )}
            </div>

            <div className="flex flex-col gap-1">
              <label htmlFor="unreg-student-birthdate" className="text-xs text-gray-500">
                Fecha de nacimiento del alumno
              </label>
              <input
                id="unreg-student-birthdate"
                type="date"
                value={unregStudentBirthDate}
                onChange={(event) => setUnregStudentBirthDate(event.target.value)}
                className="rounded-md border border-gray-300 px-3 py-2 text-sm"
              />
              {fieldErrors.birthDate && (
                <p className="text-xs text-red-600">{fieldErrors.birthDate}</p>
              )}
            </div>

            <div className="flex flex-col gap-1">
              <label htmlFor="unreg-enrollment-date" className="text-xs text-gray-500">
                Fecha de inscripcion *
              </label>
              <input
                id="unreg-enrollment-date"
                type="date"
                value={enrollmentDate}
                onChange={(event) => setEnrollmentDate(event.target.value)}
                className="rounded-md border border-gray-300 px-3 py-2 text-sm"
              />
              {fieldErrors.enrollmentDate && (
                <p className="text-xs text-red-600">{fieldErrors.enrollmentDate}</p>
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
                {isSaving ? "Inscribiendo..." : "Inscribir alumno"}
              </button>
            </div>
          </form>
        )}

        {formError && <p className="text-sm text-red-600">{formError}</p>}
      </div>
    </div>
  );
}

