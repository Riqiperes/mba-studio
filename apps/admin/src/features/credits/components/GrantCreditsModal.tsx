import { useEffect, useState, type FormEvent } from "react";
import { z } from "zod";
import { getErrorMessage } from "@/utils/getErrorMessage";
import { buttonClasses } from "@/components/ui/buttonStyles";
import { ModalShell } from "@/components/ui/ModalShell";

const schema = z.object({
  amount: z.coerce
    .number()
    .int("La cantidad debe ser un numero entero")
    .positive("La cantidad debe ser mayor a 0"),
  notes: z.string().optional(),
});

type Props = {
  open: boolean;
  onClose: () => void;
  onSubmit: (amount: number, notes?: string | null) => Promise<void>;
};

export function GrantCreditsModal({ open, onClose, onSubmit }: Props) {
  const [amount, setAmount] = useState("1");
  const [notes, setNotes] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setAmount("1");
    setNotes("");
    setFieldErrors({});
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

    const result = schema.safeParse({ amount, notes });
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
      await onSubmit(result.data.amount, result.data.notes || null);
      onClose();
    } catch (err) {
      setFormError(getErrorMessage(err, "No se pudo otorgar creditos."));
      console.error("[credits] grant fallo", err);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <ModalShell onClose={onClose} size="sm" bodyClassName="">
      <form
        id="grant-credits-modal"
        onSubmit={handleSubmit}
        noValidate
        className="flex flex-col gap-3"
      >
        <h2 className="font-display text-subtitulo font-medium text-texto">Otorgar creditos</h2>

        <div className="flex flex-col gap-1">
          <label htmlFor="grant-credits-amount-input" className="etiqueta-campo">
            Cantidad
          </label>
          <input
            id="grant-credits-amount-input"
            type="number"
            min={1}
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            className="campo"
          />
          {fieldErrors.amount && <p role="alert" className="flex items-start gap-2 rounded-control bg-suave px-3 py-2 text-pequeno text-alerta">{fieldErrors.amount}</p>}
        </div>

        <div className="flex flex-col gap-1">
          <textarea
            id="grant-credits-notes-input"
            placeholder="Nota (opcional)"
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            className="campo"
          />
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
            {isSaving ? "Guardando..." : "Otorgar"}
          </button>
        </div>

        {formError && <p role="alert" className="flex items-start gap-2 rounded-control bg-suave px-3 py-2 text-pequeno text-alerta">{formError}</p>}
      </form>
    </ModalShell>
  );
}
