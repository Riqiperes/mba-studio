import { useEffect, useState, type FormEvent } from "react";
import { z } from "zod";
import { getErrorMessage } from "@/utils/getErrorMessage";
import type { Dependent } from "../types/Dependent";

const schema = z.object({
  fullName: z.string().min(1, "El nombre del alumno es obligatorio"),
  birthDate: z
    .string()
    .refine((value) => value === "" || !isNaN(Date.parse(value)), {
      message: "Fecha de nacimiento invalida",
    })
    .refine((value) => value === "" || new Date(value) <= new Date(), {
      message: "La fecha de nacimiento no puede ser futura",
    }),
  guardianName: z.string().optional(),
  guardianPhone: z.string().optional(),
  age: z.string(),
  medicalConditions: z.string().optional(),
  notes: z.string().optional(),
});

export type DependentFormInput = {
  fullName: string;
  birthDate?: string | null;
  guardianName?: string | null;
  guardianPhone?: string | null;
  age?: number | null;
  medicalConditions?: string | null;
  notes?: string | null;
};

type Props = {
  open: boolean;
  initialValue: Dependent | null;
  showGuardianFields?: boolean;
  onClose: () => void;
  onSubmit: (input: DependentFormInput) => Promise<void>;
};

export function DependentFormModal({
  open,
  initialValue,
  showGuardianFields = false,
  onClose,
  onSubmit,
}: Props) {
  const [fullName, setFullName] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [guardianName, setGuardianName] = useState("");
  const [guardianPhone, setGuardianPhone] = useState("");
  const [age, setAge] = useState("");
  const [medicalConditions, setMedicalConditions] = useState("");
  const [notes, setNotes] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const shouldShowGuardian = showGuardianFields || Boolean(initialValue && !initialValue.guardianId);

  useEffect(() => {
    if (!open) return;
    setFullName(initialValue?.fullName ?? "");
    setBirthDate(initialValue?.birthDate ?? "");
    setGuardianName(initialValue?.guardianName ?? "");
    setGuardianPhone(initialValue?.guardianPhone ?? "");
    setAge(initialValue?.age != null ? String(initialValue.age) : "");
    setMedicalConditions(initialValue?.medicalConditions ?? "");
    setNotes(initialValue?.notes ?? "");
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

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);

    const result = schema.safeParse({
      fullName,
      birthDate,
      guardianName,
      guardianPhone,
      age,
      medicalConditions,
      notes,
    });
    if (!result.success) {
      const errors: Record<string, string> = {};
      for (const issue of result.error.issues) {
        errors[String(issue.path[0])] = issue.message;
      }
      setFieldErrors(errors);
      return;
    }

    if (shouldShowGuardian && (!guardianName || guardianName.trim() === "")) {
      setFieldErrors({ guardianName: "El nombre del tutor es obligatorio" });
      return;
    }

    setFieldErrors({});
    setIsSaving(true);
    try {
      await onSubmit({
        fullName: result.data.fullName,
        birthDate: result.data.birthDate ? result.data.birthDate : null,
        guardianName: shouldShowGuardian ? (guardianName.trim() || null) : null,
        guardianPhone: shouldShowGuardian ? (guardianPhone.trim() || null) : null,
        age: result.data.age === "" ? null : Number(result.data.age),
        medicalConditions: result.data.medicalConditions?.trim() || null,
        notes: result.data.notes?.trim() || null,
      });
      onClose();
    } catch (err) {
      setFormError(getErrorMessage(err, "No se pudo guardar el alumno."));
      console.error("[dependents] guardar fallo", err);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/40 p-4">
      <form
        id="dependent-form-modal"
        onSubmit={handleSubmit}
        noValidate
        className="flex w-full max-w-sm flex-col gap-3 rounded-lg bg-white p-6"
      >
        <h2 className="text-lg font-semibold text-brand-primary">
          {initialValue ? "Editar alumno" : "Nuevo alumno"}
        </h2>

        {shouldShowGuardian && (
          <>
            <div className="flex flex-col gap-1">
              <label htmlFor="dependent-guardian-name-input" className="text-xs text-gray-500">
                Nombre del tutor *
              </label>
              <input
                id="dependent-guardian-name-input"
                type="text"
                placeholder="Nombre del tutor o padre"
                value={guardianName}
                onChange={(event) => setGuardianName(event.target.value)}
                className="rounded-md border border-gray-300 px-3 py-2 text-sm"
              />
              {fieldErrors.guardianName && (
                <p className="text-xs text-red-600">{fieldErrors.guardianName}</p>
              )}
            </div>

            <div className="flex flex-col gap-1">
              <label htmlFor="dependent-guardian-phone-input" className="text-xs text-gray-500">
                Telefono del tutor (opcional)
              </label>
              <input
                id="dependent-guardian-phone-input"
                type="tel"
                placeholder="Ej. 9991234567"
                value={guardianPhone}
                onChange={(event) => setGuardianPhone(event.target.value)}
                className="rounded-md border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
          </>
        )}

        <div className="flex flex-col gap-1">
          <label htmlFor="dependent-fullname-input" className="text-xs text-gray-500">
            Nombre del alumno *
          </label>
          <input
            id="dependent-fullname-input"
            type="text"
            placeholder="Nombre completo"
            value={fullName}
            onChange={(event) => setFullName(event.target.value)}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
          {fieldErrors.fullName && <p className="text-xs text-red-600">{fieldErrors.fullName}</p>}
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="dependent-birthdate-input" className="text-xs text-gray-500">
            Fecha de nacimiento (opcional)
          </label>
          <input
            id="dependent-birthdate-input"
            type="date"
            value={birthDate}
            onChange={(event) => setBirthDate(event.target.value)}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
          {fieldErrors.birthDate && (
            <p className="text-xs text-red-600">{fieldErrors.birthDate}</p>
          )}
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="dependent-age-input" className="text-xs text-gray-500">
            Edad (opcional)
          </label>
          <input
            id="dependent-age-input"
            type="number"
            min={0}
            max={120}
            value={age}
            onChange={(event) => setAge(event.target.value)}
            className="w-24 rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="dependent-medical-conditions-input" className="text-xs text-gray-500">
            Condiciones medicas (opcional)
          </label>
          <textarea
            id="dependent-medical-conditions-input"
            rows={2}
            placeholder="Embarazo, hernia, lesiones, etc."
            value={medicalConditions}
            onChange={(event) => setMedicalConditions(event.target.value)}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="dependent-notes-input" className="text-xs text-gray-500">
            Notas adicionales (opcional)
          </label>
          <textarea
            id="dependent-notes-input"
            rows={2}
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
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

