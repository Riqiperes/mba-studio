import { useEffect, useState, type FormEvent } from "react";
import { z } from "zod";
import type { Package } from "../types/Package";

const schema = z.object({
  name: z.string().min(1, "El nombre es obligatorio"),
  description: z.string().optional(),
  credits: z.coerce
    .number()
    .int("Los creditos deben ser un numero entero")
    .positive("Los creditos deben ser mayor a 0"),
  price: z.coerce
    .number()
    .int("El precio debe ser un numero entero de pesos")
    .nonnegative("El precio no puede ser negativo"),
  validDays: z
    .string()
    .refine((value) => value === "" || (/^\d+$/.test(value) && Number(value) > 0), {
      message: "La vigencia debe ser un numero entero de dias, o vacio para sin vencimiento",
    }),
});

type PackageInput = {
  name: string;
  description?: string | null;
  credits: number;
  price: number;
  validDays?: number | null;
};

type Props = {
  open: boolean;
  initialValue: Package | null;
  onClose: () => void;
  onSubmit: (input: PackageInput) => Promise<void>;
};

// Distingue el motivo real del rechazo (RLS vs constraint vs desconocido)
// en vez de un mensaje generico, igual que mapAuthError en apps/web.
function mapSaveError(err: unknown): string {
  const message = err instanceof Error ? err.message : "";
  if (message.includes("row-level security") || message.includes("42501")) {
    return "No tienes permiso para esta accion.";
  }
  if (message.includes("violates check constraint") || message.includes("violates not-null constraint")) {
    return "Revisa los datos del formulario.";
  }
  return "No se pudo guardar. Intenta de nuevo.";
}

export function PackageFormModal({ open, initialValue, onClose, onSubmit }: Props) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [credits, setCredits] = useState("1");
  const [price, setPrice] = useState("0");
  const [validDays, setValidDays] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName(initialValue?.name ?? "");
    setDescription(initialValue?.description ?? "");
    setCredits(String(initialValue?.credits ?? 1));
    setPrice(initialValue ? String(Math.round(initialValue.priceCents / 100)) : "0");
    setValidDays(initialValue?.validDays ? String(initialValue.validDays) : "");
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

    const result = schema.safeParse({ name, description, credits, price, validDays });
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
      await onSubmit({
        name: result.data.name,
        description: result.data.description || null,
        credits: result.data.credits,
        price: result.data.price,
        validDays: result.data.validDays ? Number(result.data.validDays) : null,
      });
      onClose();
    } catch (err) {
      setFormError(mapSaveError(err));
      console.error("[packages] guardar fallo", err);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/40 p-4">
      <form
        id="package-form-modal"
        onSubmit={handleSubmit}
        noValidate
        className="flex w-full max-w-sm flex-col gap-3 rounded-lg bg-white p-6"
      >
        <h2 className="text-lg font-semibold text-brand-primary">
          {initialValue ? "Editar paquete" : "Nuevo paquete"}
        </h2>

        <div className="flex flex-col gap-1">
          <input
            id="package-name-input"
            type="text"
            placeholder="Nombre"
            value={name}
            onChange={(event) => setName(event.target.value)}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
          {fieldErrors.name && <p className="text-xs text-red-600">{fieldErrors.name}</p>}
        </div>

        <div className="flex flex-col gap-1">
          <textarea
            id="package-description-input"
            placeholder="Descripcion (opcional)"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="package-credits-input" className="text-xs text-gray-500">
            Creditos
          </label>
          <input
            id="package-credits-input"
            type="number"
            min={1}
            value={credits}
            onChange={(event) => setCredits(event.target.value)}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
          {fieldErrors.credits && <p className="text-xs text-red-600">{fieldErrors.credits}</p>}
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="package-price-input" className="text-xs text-gray-500">
            Precio (MXN, pesos)
          </label>
          <input
            id="package-price-input"
            type="number"
            min={0}
            value={price}
            onChange={(event) => setPrice(event.target.value)}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
          {fieldErrors.price && <p className="text-xs text-red-600">{fieldErrors.price}</p>}
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="package-valid-days-input" className="text-xs text-gray-500">
            Vigencia en dias (vacio = sin vencimiento)
          </label>
          <input
            id="package-valid-days-input"
            type="number"
            min={1}
            value={validDays}
            onChange={(event) => setValidDays(event.target.value)}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
          {fieldErrors.validDays && (
            <p className="text-xs text-red-600">{fieldErrors.validDays}</p>
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
            {isSaving ? "Guardando..." : "Guardar"}
          </button>
        </div>

        {formError && <p className="text-sm text-red-600">{formError}</p>}
      </form>
    </div>
  );
}
