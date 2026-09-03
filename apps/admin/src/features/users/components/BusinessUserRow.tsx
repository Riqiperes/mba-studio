import { useEffect, useState } from "react";
import type { UserRole } from "@mba-studio/shared";
import type { Instructor } from "@/features/instructors/types/Instructor";
import type { BusinessUser } from "../types/User";

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
    <tr className="border-b border-gray-100 align-top">
      <td className="py-2">{user.fullName ?? "-"}</td>
      <td className="py-2">{user.email}</td>
      <td className="py-2">
        <select
          value={role}
          onChange={(event) => setRole(event.target.value as UserRole)}
          className="rounded-md border border-gray-300 px-2 py-1 text-sm"
        >
          {availableRoles.map((r) => (
            <option key={r} value={r}>
              {ROLE_LABELS[r]}
            </option>
          ))}
        </select>
      </td>
      <td className="py-2">
        {role === "INSTRUCTOR_ADMIN" ? (
          <select
            value={instructorId}
            onChange={(event) => setInstructorId(event.target.value)}
            className="rounded-md border border-gray-300 px-2 py-1 text-sm"
          >
            <option value="">Elige instructor</option>
            {instructors.map((instructor) => (
              <option key={instructor.id} value={instructor.id}>
                {instructor.fullName}
              </option>
            ))}
          </select>
        ) : (
          <span className="text-xs text-gray-400">-</span>
        )}
      </td>
      <td className="py-2">
        <button
          type="button"
          onClick={handleSave}
          disabled={!dirty || isSaving || (role === "INSTRUCTOR_ADMIN" && !instructorId)}
          className="rounded-md bg-brand-primary px-3 py-1 text-xs font-medium text-white hover:opacity-90 disabled:opacity-50"
        >
          {isSaving ? "Guardando..." : "Guardar"}
        </button>
        {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
      </td>
    </tr>
  );
}
