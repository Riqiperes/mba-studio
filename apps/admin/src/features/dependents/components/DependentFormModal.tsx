import { useEffect, useState, type FormEvent } from "react";
import { z } from "zod";
import { getErrorMessage } from "@/utils/getErrorMessage";
import type { Dependent } from "../types/Dependent";
import { buttonClasses } from "@/components/ui/buttonStyles";
import { ModalShell } from "@/components/ui/ModalShell";

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
});

export type DependentFormInput = {
  fullName: string;
  birthDate?: string | null;
  guardianName?: string | null;
  guardianPhone?: string | null;
};

type Props = {
  open: boolean;
  initialValue: Dependent | null;
  showGuardianFields?: boolean;
  onClose: () => void;
  onSubmit: (input: DependentFormInput) => Promise<void>;
  /** Solo se muestra al editar (`initialValue` presente). */
  onToggleActive?: (() => Promise<void>) | undefined;
};

export function DependentFormModal({
  open,
  initialValue,
  showGuardianFields = false,
  onClose,
  onSubmit,
  onToggleActive,
}: Props) {
  const [fullName, setFullName] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [guardianName, setGuardianName] = useState("");
  const [guardianPhone, setGuardianPhone] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isTogglingActive, setIsTogglingActive] = useState(false);

  const shouldShowGuardian = showGuardianFields || Boolean(initialValue && !initialValue.guardianId);

  useEffect(() => {
    if (!open) return;
    setFullName(initialValue?.fullName ?? "");
    setBirthDate(initialValue?.birthDate ?? "");
    setGuardianName(initialValue?.guardianName ?? "");
    setGuardianPhone(initialValue?.guardianPhone ?? "");
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

    const result = schema.safeParse({ fullName, birthDate, guardianName, guardianPhone });
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
      });
      onClose();
    } catch (err) {
      setFormError(getErrorMessage(err, "No se pudo guardar el alumno."));
      console.error("[dependents] guardar fallo", err);
    } finally {
      setIsSaving(false);
    }
  }

  async function handleToggleActive() {
    if (!onToggleActive) return;
    setIsTogglingActive(true);
    try {
      await onToggleActive();
      onClose();
    } catch (err) {
      setFormError(getErrorMessage(err, "No se pudo actualizar el alumno."));
      console.error("[dependents] toggle active fallo", err);
    } finally {
      setIsTogglingActive(false);
    }
  }

  return (
    <ModalShell onClose={onClose} size="sm" bodyClassName="">
      <form
        id="dependent-form-modal"
        onSubmit={handleSubmit}
        noValidate
        className="flex flex-col gap-3"
      >
        <h2 className="font-display text-subtitulo font-medium text-texto">
          {initialValue ? "Editar alumno" : "Nuevo alumno"}
        </h2>

        {shouldShowGuardian && (
          <>
            <div className="flex flex-col gap-1">
              <label htmlFor="dependent-guardian-name-input" className="etiqueta-campo">
                Nombre del tutor *
              </label>
              <input
                id="dependent-guardian-name-input"
                type="text"
                placeholder="Nombre del tutor o padre"
                value={guardianName}
                onChange={(event) => setGuardianName(event.target.value)}
                className="campo"
              />
              {fieldErrors.guardianName && (
                <p role="alert" className="flex items-start gap-2 rounded-control bg-suave px-3 py-2 text-pequeno text-alerta">{fieldErrors.guardianName}</p>
              )}
            </div>

            <div className="flex flex-col gap-1">
              <label htmlFor="dependent-guardian-phone-input" className="etiqueta-campo">
                Telefono del tutor (opcional)
              </label>
              <input
                id="dependent-guardian-phone-input"
                type="tel"
                placeholder="Ej. 9991234567"
                value={guardianPhone}
                onChange={(event) => setGuardianPhone(event.target.value)}
                className="campo"
              />
            </div>
          </>
        )}

        <div className="flex flex-col gap-1">
          <label htmlFor="dependent-fullname-input" className="etiqueta-campo">
            Nombre del alumno *
          </label>
          <input
            id="dependent-fullname-input"
            type="text"
            placeholder="Nombre completo"
            value={fullName}
            onChange={(event) => setFullName(event.target.value)}
            className="campo"
          />
          {fieldErrors.fullName && <p role="alert" className="flex items-start gap-2 rounded-control bg-suave px-3 py-2 text-pequeno text-alerta">{fieldErrors.fullName}</p>}
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="dependent-birthdate-input" className="etiqueta-campo">
            Fecha de nacimiento (opcional)
          </label>
          <input
            id="dependent-birthdate-input"
            type="date"
            value={birthDate}
            onChange={(event) => setBirthDate(event.target.value)}
            className="campo"
          />
          {fieldErrors.birthDate && (
            <p role="alert" className="flex items-start gap-2 rounded-control bg-suave px-3 py-2 text-pequeno text-alerta">{fieldErrors.birthDate}</p>
          )}
        </div>

        <div className="flex items-center justify-between gap-2 pt-2">
          {onToggleActive ? (
            <button
              type="button"
              onClick={handleToggleActive}
              disabled={isTogglingActive}
              className="accion text-texto-suave"
            >
              {initialValue?.active ? "Desactivar" : "Activar"}
            </button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
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
        </div>

        {formError && <p role="alert" className="flex items-start gap-2 rounded-control bg-suave px-3 py-2 text-pequeno text-alerta">{formError}</p>}
      </form>
    </ModalShell>
  );
}
