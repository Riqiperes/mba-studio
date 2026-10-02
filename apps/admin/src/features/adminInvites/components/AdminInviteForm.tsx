import { useState, type FormEvent } from "react";
import type { AdminInviteRole } from "../types/AdminInvite";
import { buttonClasses } from "@/components/ui/buttonStyles";

const ROLE_LABELS: Record<AdminInviteRole, string> = {
  STAFF: "Staff",
  BUSINESS_ADMIN: "Admin del negocio",
  SUPER_ADMIN: "Super admin",
};

type Props = {
  onSubmit: (email: string, role: AdminInviteRole) => Promise<void>;
};

export function AdminInviteForm({ onSubmit }: Props) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<AdminInviteRole>("STAFF");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSaving(true);
    try {
      await onSubmit(email.trim(), role);
      setEmail("");
      setRole("STAFF");
    } catch (err) {
      setError("No se pudo agregar la invitacion.");
      console.error("[adminInvites] add fallo", err);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <form
      id="admin-invite-form"
      onSubmit={handleSubmit}
      className="mb-6 flex flex-wrap items-end gap-3 rounded-card border border-borde bg-tarjeta p-4"
    >
      <div className="flex flex-col gap-1">
        <label htmlFor="admin-invite-email" className="etiqueta-campo">
          Correo
        </label>
        <input
          id="admin-invite-email"
          type="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="correo@ejemplo.com"
          className="campo"
        />
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="admin-invite-role" className="etiqueta-campo">
          Rol
        </label>
        <select
          id="admin-invite-role"
          value={role}
          onChange={(event) => setRole(event.target.value as AdminInviteRole)}
          className="campo"
        >
          {(Object.keys(ROLE_LABELS) as AdminInviteRole[]).map((r) => (
            <option key={r} value={r}>
              {ROLE_LABELS[r]}
            </option>
          ))}
        </select>
      </div>
      <button
        type="submit"
        disabled={isSaving || !email.trim()}
        className={buttonClasses("primary", "md")}
      >
        {isSaving ? "Agregando..." : "Agregar admin"}
      </button>
      {error && <p className="w-full text-pequeno text-alerta">{error}</p>}
    </form>
  );
}
