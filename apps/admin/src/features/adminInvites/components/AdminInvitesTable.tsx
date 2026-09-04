import type { UserRole } from "@mba-studio/shared";
import type { AdminInvite } from "../types/AdminInvite";

const ROLE_LABELS: Record<UserRole, string> = {
  CUSTOMER: "Cliente",
  STAFF: "Staff",
  BUSINESS_ADMIN: "Admin del negocio",
  SUPER_ADMIN: "Super admin",
  INSTRUCTOR_ADMIN: "Instructor",
};

type Props = {
  invites: AdminInvite[];
  onRemove: (invite: AdminInvite) => void;
};

export function AdminInvitesTable({ invites, onRemove }: Props) {
  if (invites.length === 0) {
    return <p className="text-sm text-gray-500">Todavia no hay invitaciones de admin.</p>;
  }

  return (
    <table id="admin-invites-table" className="w-full border-collapse text-sm">
      <thead>
        <tr className="border-b border-gray-200 text-left text-gray-500">
          <th className="py-2">Correo</th>
          <th className="py-2">Rol</th>
          <th className="py-2">Estado</th>
          <th className="py-2">Acciones</th>
        </tr>
      </thead>
      <tbody>
        {invites.map((invite) => (
          <tr key={invite.email} className="border-b border-gray-100">
            <td className="py-2">{invite.email}</td>
            <td className="py-2">{ROLE_LABELS[invite.role]}</td>
            <td className="py-2">
              <span
                className={
                  invite.registered
                    ? "rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-700"
                    : "rounded-full bg-yellow-100 px-2 py-0.5 text-xs text-yellow-700"
                }
              >
                {invite.registered ? "Ya se registro" : "Pendiente"}
              </span>
            </td>
            <td className="py-2">
              <button
                type="button"
                onClick={() => onRemove(invite)}
                className="text-red-600 hover:underline"
              >
                Quitar
              </button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
