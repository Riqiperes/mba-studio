import { useEffect, useState, type FormEvent } from "react";
import { z } from "zod";
import type { Instructor } from "../types/Instructor";

const schema = z.object({
  fullName: z.string().min(1, "El nombre es obligatorio"),
  bio: z.string().optional(),
  photoUrl: z.string().url("URL invalida").optional().or(z.literal("")),
});

type InstructorInput = { fullName: string; bio?: string | null; photoUrl?: string | null };

type Props = {
  open: boolean;
  initialValue: Instructor | null;
  onClose: () => void;
  onSubmit: (input: InstructorInput) => Promise<void>;
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

export function InstructorFormModal({ open, initialValue, onClose, onSubmit }: Props) {
  const [fullName, setFullName] = useState("");
  const [bio, setBio] = useState("");
  const [photoUrl, setPhotoUrl] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setFullName(initialValue?.fullName ?? "");
    setBio(initialValue?.bio ?? "");
    setPhotoUrl(initialValue?.photoUrl ?? "");
    setFieldErrors({});
    setFormError(null);
  }, [open, initialValue]);

  if (!open) return null;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);

    const result = schema.safeParse({ fullName, bio, photoUrl });
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
        fullName,
        bio: bio || null,
        photoUrl: photoUrl || null,
      });
      onClose();
    } catch (err) {
      setFormError(mapSaveError(err));
      console.error("[instructors] guardar fallo", err);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/40 p-4">
      <form
        id="instructor-form-modal"
        onSubmit={handleSubmit}
        noValidate
        className="flex w-full max-w-sm flex-col gap-3 rounded-lg bg-white p-6"
      >
        <h2 className="text-lg font-semibold text-brand-primary">
          {initialValue ? "Editar instructor" : "Nuevo instructor"}
        </h2>

        <div className="flex flex-col gap-1">
          <input
            id="instructor-fullname-input"
            type="text"
            placeholder="Nombre completo"
            value={fullName}
            onChange={(event) => setFullName(event.target.value)}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
          {fieldErrors.fullName && <p className="text-xs text-red-600">{fieldErrors.fullName}</p>}
        </div>

        <div className="flex flex-col gap-1">
          <textarea
            id="instructor-bio-input"
            placeholder="Bio (opcional)"
            value={bio}
            onChange={(event) => setBio(event.target.value)}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
        </div>

        <div className="flex flex-col gap-1">
          <input
            id="instructor-photo-input"
            type="text"
            placeholder="URL de foto (opcional)"
            value={photoUrl}
            onChange={(event) => setPhotoUrl(event.target.value)}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
          {fieldErrors.photoUrl && <p className="text-xs text-red-600">{fieldErrors.photoUrl}</p>}
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
