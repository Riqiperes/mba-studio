import { useEffect, useState, type FormEvent } from "react";
import { z } from "zod";

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
      setFormError(err instanceof Error ? err.message : "No se pudo otorgar creditos.");
      console.error("[credits] grant fallo", err);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/40 p-4">
      <form
        id="grant-credits-modal"
        onSubmit={handleSubmit}
        noValidate
        className="flex w-full max-w-sm flex-col gap-3 rounded-lg bg-white p-6"
      >
        <h2 className="text-lg font-semibold text-brand-primary">Otorgar creditos</h2>

        <div className="flex flex-col gap-1">
          <label htmlFor="grant-credits-amount-input" className="text-xs text-gray-500">
            Cantidad
          </label>
          <input
            id="grant-credits-amount-input"
            type="number"
            min={1}
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
          {fieldErrors.amount && <p className="text-xs text-red-600">{fieldErrors.amount}</p>}
        </div>

        <div className="flex flex-col gap-1">
          <textarea
            id="grant-credits-notes-input"
            placeholder="Nota (opcional)"
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
            {isSaving ? "Guardando..." : "Otorgar"}
          </button>
        </div>

        {formError && <p className="text-sm text-red-600">{formError}</p>}
      </form>
    </div>
  );
}
