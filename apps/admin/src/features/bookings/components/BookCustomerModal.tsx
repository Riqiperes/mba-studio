import { useEffect, useState, type FormEvent } from "react";
import type { Customer } from "@/features/customers/types/Customer";
import { getErrorMessage } from "@/utils/getErrorMessage";
import { buttonClasses } from "@/components/ui/buttonStyles";
import { ModalShell } from "@/components/ui/ModalShell";

/** A quien se reserva: un cliente registrado o un "No registrado" (solo nombre). */
export type BookingTarget = { kind: "customer"; customerId: string } | { kind: "guest"; guestName: string };

type Props = {
  open: boolean;
  title: string;
  submitLabel: string;
  customers: Customer[];
  onClose: () => void;
  onSubmit: (target: BookingTarget) => Promise<void>;
};

export function BookCustomerModal({ open, title, submitLabel, customers, onClose, onSubmit }: Props) {
  const [kind, setKind] = useState<BookingTarget["kind"]>("customer");
  const [customerId, setCustomerId] = useState("");
  const [guestName, setGuestName] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setKind("customer");
    setCustomerId("");
    setGuestName("");
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
    if (kind === "customer" && !customerId) {
      setFormError("Elige un cliente");
      return;
    }
    if (kind === "guest" && !guestName.trim()) {
      setFormError("Escribe el nombre de la persona");
      return;
    }
    setIsSaving(true);
    try {
      await onSubmit(kind === "customer" ? { kind, customerId } : { kind, guestName: guestName.trim() });
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

        <div id="book-customer-kind" role="radiogroup" aria-label="Tipo de cliente" className="grid grid-cols-2 gap-2">
          {(
            [
              ["customer", "Cliente registrado"],
              ["guest", "No registrado"],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={kind === value}
              onClick={() => setKind(value)}
              className={buttonClasses(kind === value ? "soft" : "outline", "sm")}
            >
              {label}
            </button>
          ))}
        </div>

        {kind === "guest" ? (
          <div className="flex flex-col gap-1">
            <label htmlFor="book-guest-name-input" className="etiqueta-campo">
              Nombre
            </label>
            <input
              id="book-guest-name-input"
              type="text"
              maxLength={120}
              autoComplete="off"
              value={guestName}
              onChange={(event) => setGuestName(event.target.value)}
              className="campo"
            />
            <p className="text-pequeno text-texto-suave">Ocupa un lugar en la clase y no usa créditos.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-1">
            <label htmlFor="book-customer-select" className="etiqueta-campo">
              Cliente
            </label>
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
        )}

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

        {formError && <p role="alert" className="alerta-entra flex items-start gap-2 rounded-control bg-suave px-3 py-2 text-pequeno text-alerta">{formError}</p>}
      </form>
    </ModalShell>
  );
}
