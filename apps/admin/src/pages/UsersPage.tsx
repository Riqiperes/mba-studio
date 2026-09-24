import { BackButton } from "@/components/ui/BackButton";
import { useAuth } from "@/features/auth/hooks/AuthProvider";
import { useInstructors } from "@/features/instructors/hooks/useInstructors";
import { BusinessUserRow } from "@/features/users/components/BusinessUserRow";
import { useUsers } from "@/features/users/hooks/useUsers";
import { ScreenHeader } from "@/components/ui/ScreenHeader";

export function UsersPage() {
  const { profile } = useAuth();
  const { users, loading, error, setRole } = useUsers();
  const { instructors } = useInstructors();

  return (
    <div id="users-page" className="mx-auto max-w-5xl p-4 sm:p-6">
      <BackButton />
      <ScreenHeader
        eyebrow="Administración"
        title="Usuarios"
        lead={
          <>
            Cuentas registradas en el negocio. Cambia el rol para dar acceso al panel (staff/admin) o
            vincular una cuenta como instructor.
          </>
        }
      />

      {loading && <p role="status" className="text-pequeno text-texto-suave">Cargando…</p>}
      {error && <p role="alert" className="flex items-start gap-2 rounded-control bg-suave px-3 py-2 text-pequeno text-alerta">{error}</p>}
      {!loading && !error && (
        <div className="tabla-contenedor">
        <table id="users-table" className="tabla">
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Email</th>
                <th>Rol</th>
                <th>Instructor vinculado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <BusinessUserRow
                  key={user.id}
                  user={user}
                  instructors={instructors}
                  actingRole={profile?.role ?? "CUSTOMER"}
                  onSave={(role, instructorId) => setRole(user.id, role, instructorId)}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
