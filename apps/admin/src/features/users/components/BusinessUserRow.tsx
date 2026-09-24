import { useEffect, useState } from "react";
import type { UserRole } from "@mba-studio/shared";
import type { Instructor } from "@/features/instructors/types/Instructor";
import type { BusinessUser } from "../types/User";
import { buttonClasses } from "@/components/ui/buttonStyles";

const ROLE_LABELS: Record<UserRole, string> = {
  CUSTOMER: "Cliente",
  STAFF: "Staff",
  BUSINESS_ADMIN: "Admin del negocio",
  SUPER_ADMIN: "Super admin",
  INSTRUCTOR_ADMIN: "Instructor",
};

type Props = {
  user: BusinessUser;
  instructors: Instructor[];
  /** Solo un SUPER_ADMIN puede otorgar SUPER_ADMIN (007_fix_profiles_privilege_escalation.sql,
   * el trigger revierte en silencio si no) -- no ofrecer la opcion si el actor no lo es. */
  actingRole: UserRole;
  onSave: (role: UserRole, instructorId: string | null) => Promise<void>;
};

export function BusinessUserRow({ user, instructors, actingRole, onSave }: Props) {
  const [role, setRole] = useState<UserRole>(user.role);
  const [instructorId, setInstructorId] = useState(user.instructorId ?? "");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setRole(user.role);
    setInstructorId(user.instructorId ?? "");
  }, [user.role, user.instructorId]);

  const dirty = role !== user.role || instructorId !== (user.instructorId ?? "");
  const availableRoles = (Object.keys(ROLE_LABELS) as UserRole[]).filter(
    (r) => r !== "SUPER_ADMIN" || actingRole === "SUPER_ADMIN" || user.role === "SUPER_ADMIN",
  );

  async function handleSave() {
    setError(null);
    setIsSaving(true);
    try {
      await onSave(role, role === "INSTRUCTOR_ADMIN" ? instructorId || null : null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar.");
      console.error("[users] guardar rol fallo", err);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <tr className="border-b border-borde align-top">
      <td>{user.fullName ?? "-"}</td>
      <td>{user.email}</td>
      <td>
        <select
          value={role}
          onChange={(event) => setRole(event.target.value as UserRole)}
          className="campo campo-compacto"
        >
          {availableRoles.map((r) => (
            <option key={r} value={r}>
              {ROLE_LABELS[r]}
            </option>
          ))}
        </select>
      </td>
      <td>
        {role === "INSTRUCTOR_ADMIN" ? (
          <select
            value={instructorId}
            onChange={(event) => setInstructorId(event.target.value)}
            className="campo campo-compacto"
          >
            <option value="">Elige instructor</option>
            {instructors.map((instructor) => (
              <option key={instructor.id} value={instructor.id}>
                {instructor.fullName}
              </option>
            ))}
          </select>
        ) : (
          <span className="text-pequeno text-texto-suave">-</span>
        )}
      </td>
      <td>
        <button
          type="button"
          onClick={handleSave}
          disabled={!dirty || isSaving || (role === "INSTRUCTOR_ADMIN" && !instructorId)}
          className={buttonClasses("primary", "sm")}
        >
          {isSaving ? "Guardando..." : "Guardar"}
        </button>
        {error && <p role="alert" className="mt-1 flex items-start gap-2 rounded-control bg-suave px-3 py-2 text-pequeno text-alerta">{error}</p>}
      </td>
    </tr>
  );
}
