import { useEffect, useState, type FormEvent } from "react";
import { getErrorMessage } from "@/utils/getErrorMessage";

export type CustomerCreateInput = {
  fullName: string;
  phone: string | null;
  medicalConditions: string | null;
  notes: string | null;
};

type Props = {
  open: boolean;
  onClose: () => void;
  onSubmit: (input: CustomerCreateInput) => Promise<void>;
};

export function CustomerCreateModal({ open, onClose, onSubmit }: Props) {
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [medicalConditions, setMedicalConditions] = useState("");
  const [notes, setNotes] = useState("");
  const [nameError, setNameError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setFullName("");
    setPhone("");
    setMedicalConditions("");
    setNotes("");
    setNameError(null);
    setFormError(null);
  }, [open]);

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

    if (fullName.trim() === "") {
      setNameError("El nombre del cliente es obligatorio");
      return;
    }
    setNameError(null);

    setIsSaving(true);
    try {
      await onSubmit({
        fullName: fullName.trim(),
        phone: phone.trim() || null,
        medicalConditions: medicalConditions.trim() || null,
        notes: notes.trim() || null,
      });
      onClose();
    } catch (err) {
      setFormError(getErrorMessage(err, "No se pudo crear el cliente."));
      console.error("[customers] createCustomer fallo", err);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <form
        id="customer-create-modal"
        onSubmit={handleSubmit}
        onClick={(event) => event.stopPropagation()}
        noValidate
        className="flex w-full max-w-sm flex-col gap-3 rounded-lg bg-white p-6"
      >
        <h2 className="text-lg font-semibold text-brand-primary">Nuevo cliente</h2>

        <div className="flex flex-col gap-1">
          <label htmlFor="customer-create-fullname-input" className="text-xs text-gray-500">
            Nombre completo *
          </label>
          <input
            id="customer-create-fullname-input"
            type="text"
            placeholder="Nombre completo"
            value={fullName}
            onChange={(event) => setFullName(event.target.value)}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
          {nameError && <p className="text-xs text-red-600">{nameError}</p>}
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="customer-create-phone-input" className="text-xs text-gray-500">
            Telefono (opcional)
          </label>
          <input
            id="customer-create-phone-input"
            type="tel"
            placeholder="Ej. 9991234567"
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="customer-create-medical-input" className="text-xs text-gray-500">
            Condiciones medicas (opcional)
          </label>
          <textarea
            id="customer-create-medical-input"
            rows={2}
            placeholder="Embarazo, hernia, lesiones..."
            value={medicalConditions}
            onChange={(event) => setMedicalConditions(event.target.value)}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="customer-create-notes-input" className="text-xs text-gray-500">
            Notas (opcional)
          </label>
          <textarea
            id="customer-create-notes-input"
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
