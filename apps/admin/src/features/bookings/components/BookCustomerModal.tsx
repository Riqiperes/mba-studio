import { useEffect, useState, type FormEvent } from "react";
import type { Customer } from "@/features/customers/types/Customer";
import { getErrorMessage } from "@/utils/getErrorMessage";
import { buttonClasses } from "@/components/ui/buttonStyles";
import { ModalShell } from "@/components/ui/ModalShell";

type Props = {
  open: boolean;
  title: string;
  submitLabel: string;
  customers: Customer[];
  onClose: () => void;
  onSubmit: (customerId: string) => Promise<void>;
};

export function BookCustomerModal({ open, title, submitLabel, customers, onClose, onSubmit }: Props) {
  const [customerId, setCustomerId] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setCustomerId("");
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
    if (!customerId) {
      setFormError("Elige un cliente");
      return;
    }
    setIsSaving(true);
    try {
      await onSubmit(customerId);
      onClose();
    } catch (err) {
      setFormError(getErrorMessage(err, "No se pudo completar la accion."));
      console.error("[bookings] modal submit fallo", err);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <ModalShell onClose={onClose} size="sm" bodyClassName="">
      <form
        id="book-customer-modal"
        onSubmit={handleSubmit}
        noValidate
        className="flex flex-col gap-3"
      >
        <h2 className="font-display text-subtitulo font-medium text-texto">{title}</h2>

        <div className="flex flex-col gap-1">
          <select
            id="book-customer-select"
            value={customerId}
            onChange={(event) => setCustomerId(event.target.value)}
            className="campo"
          >
            <option value="">Elige un cliente</option>
            {customers.map((customer) => (
              <option key={customer.id} value={customer.id}>
                {customer.fullName ?? customer.id}
              </option>
            ))}
          </select>
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
            {isSaving ? "Guardando..." : submitLabel}
          </button>
        </div>

        {formError && <p role="alert" className="flex items-start gap-2 rounded-control bg-suave px-3 py-2 text-pequeno text-alerta">{formError}</p>}
      </form>
    </ModalShell>
  );
}
