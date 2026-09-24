import { useEffect, useState, type FormEvent } from "react";
import { z } from "zod";
import type { Package } from "../types/Package";
import { buttonClasses } from "@/components/ui/buttonStyles";
import { ModalShell } from "@/components/ui/ModalShell";

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
    <ModalShell onClose={onClose} size="sm" bodyClassName="">
      <form
        id="package-form-modal"
        onSubmit={handleSubmit}
        noValidate
        className="flex flex-col gap-3"
      >
        <h2 className="font-display text-subtitulo font-medium text-texto">
          {initialValue ? "Editar paquete" : "Nuevo paquete"}
        </h2>

        <div className="flex flex-col gap-1">
          <input
            id="package-name-input"
            type="text"
            placeholder="Nombre"
            value={name}
            onChange={(event) => setName(event.target.value)}
            className="campo"
          />
          {fieldErrors.name && <p role="alert" className="flex items-start gap-2 rounded-control bg-suave px-3 py-2 text-pequeno text-alerta">{fieldErrors.name}</p>}
        </div>

        <div className="flex flex-col gap-1">
          <textarea
            id="package-description-input"
            placeholder="Descripcion (opcional)"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            className="campo"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="package-credits-input" className="etiqueta-campo">
            Creditos
          </label>
          <input
            id="package-credits-input"
            type="number"
            min={1}
            value={credits}
            onChange={(event) => setCredits(event.target.value)}
            className="campo"
          />
          {fieldErrors.credits && <p role="alert" className="flex items-start gap-2 rounded-control bg-suave px-3 py-2 text-pequeno text-alerta">{fieldErrors.credits}</p>}
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="package-price-input" className="etiqueta-campo">
            Precio (MXN, pesos)
          </label>
          <input
            id="package-price-input"
            type="number"
            min={0}
            value={price}
            onChange={(event) => setPrice(event.target.value)}
            className="campo"
          />
          {fieldErrors.price && <p role="alert" className="flex items-start gap-2 rounded-control bg-suave px-3 py-2 text-pequeno text-alerta">{fieldErrors.price}</p>}
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="package-valid-days-input" className="etiqueta-campo">
            Vigencia en dias (vacio = sin vencimiento)
          </label>
          <input
            id="package-valid-days-input"
            type="number"
            min={1}
            value={validDays}
            onChange={(event) => setValidDays(event.target.value)}
            className="campo"
          />
          {fieldErrors.validDays && (
            <p role="alert" className="flex items-start gap-2 rounded-control bg-suave px-3 py-2 text-pequeno text-alerta">{fieldErrors.validDays}</p>
          )}
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
            {isSaving ? "Guardando..." : "Guardar"}
          </button>
        </div>

        {formError && <p role="alert" className="flex items-start gap-2 rounded-control bg-suave px-3 py-2 text-pequeno text-alerta">{formError}</p>}
      </form>
    </ModalShell>
  );
}
