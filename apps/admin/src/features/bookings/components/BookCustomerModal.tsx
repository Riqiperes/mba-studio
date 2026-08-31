import { useEffect, useState, type FormEvent } from "react";
import type { Customer } from "@/features/customers/types/Customer";
import { getErrorMessage } from "@/utils/getErrorMessage";

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
    <div className="fixed inset-0 flex items-center justify-center bg-black/40 p-4">
      <form
        id="book-customer-modal"
        onSubmit={handleSubmit}
        noValidate
        className="flex w-full max-w-sm flex-col gap-3 rounded-lg bg-white p-6"
      >
        <h2 className="text-lg font-semibold text-brand-primary">{title}</h2>

        <div className="flex flex-col gap-1">
          <select
            id="book-customer-select"
            value={customerId}
            onChange={(event) => setCustomerId(event.target.value)}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm"
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
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-gray-600">
            Cancelar
          </button>
          <button
            type="submit"
            disabled={isSaving}
            className="rounded-md bg-brand-primary px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
          >
            {isSaving ? "Guardando..." : submitLabel}
          </button>
        </div>

        {formError && <p className="text-sm text-red-600">{formError}</p>}
      </form>
    </div>
  );
}
