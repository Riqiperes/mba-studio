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
    return <p className="vacio">Todavía no hay invitaciones de admin.</p>;
  }

  return (
    <div className="tabla-contenedor">
    <table id="admin-invites-table" className="tabla">
        <thead>
          <tr>
            <th>Correo</th>
            <th>Rol</th>
            <th>Estado</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {invites.map((invite) => (
            <tr key={invite.email}>
              <td>{invite.email}</td>
              <td>{ROLE_LABELS[invite.role]}</td>
              <td>
                <span
                  className={
                    invite.registered
                      ? "rounded-full bg-suave px-2 py-0.5 text-pequeno text-exito"
                      : "rounded-full bg-suave px-2 py-0.5 text-pequeno text-alerta"
                  }
                >
                  {invite.registered ? "Ya se registro" : "Pendiente"}
                </span>
              </td>
              <td>
                <button
                  type="button"
                  onClick={() => onRemove(invite)}
                  className="accion text-alerta"
                >
                  Quitar
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
