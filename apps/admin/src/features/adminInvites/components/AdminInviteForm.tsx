import { useState, type FormEvent } from "react";
import type { AdminInviteRole } from "../types/AdminInvite";

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
      className="mb-6 flex flex-wrap items-end gap-3 rounded-lg border border-gray-200 bg-white p-4"
    >
      <div className="flex flex-col gap-1">
        <label htmlFor="admin-invite-email" className="text-xs font-medium text-gray-500">
          Correo
        </label>
        <input
          id="admin-invite-email"
          type="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="correo@ejemplo.com"
          className="rounded-md border border-gray-300 px-3 py-2 text-sm"
        />
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="admin-invite-role" className="text-xs font-medium text-gray-500">
          Rol
        </label>
        <select
          id="admin-invite-role"
          value={role}
          onChange={(event) => setRole(event.target.value as AdminInviteRole)}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm"
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
        className="rounded-md bg-brand-primary px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
      >
        {isSaving ? "Agregando..." : "Agregar admin"}
      </button>
      {error && <p className="w-full text-xs text-red-600">{error}</p>}
    </form>
  );
}
