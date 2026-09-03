import { BackButton } from "@/components/ui/BackButton";
import { useAuth } from "@/features/auth/hooks/AuthProvider";
import { useInstructors } from "@/features/instructors/hooks/useInstructors";
import { BusinessUserRow } from "@/features/users/components/BusinessUserRow";
import { useUsers } from "@/features/users/hooks/useUsers";

export function UsersPage() {
  const { profile } = useAuth();
  const { users, loading, error, setRole } = useUsers();
  const { instructors } = useInstructors();

  return (
    <div id="users-page" className="mx-auto max-w-5xl p-6">
      <BackButton />
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-brand-primary">Usuarios</h1>
      </div>
      <p className="mb-4 text-sm text-gray-500">
        Cuentas registradas en el negocio. Cambia el rol para dar acceso al panel (staff/admin) o
        vincular una cuenta como instructor.
      </p>

      {loading && <p className="text-sm text-gray-500">Cargando...</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}
      {!loading && !error && (
        <table id="users-table" className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-gray-200 text-left text-gray-500">
              <th className="py-2">Nombre</th>
              <th className="py-2">Email</th>
              <th className="py-2">Rol</th>
              <th className="py-2">Instructor vinculado</th>
              <th className="py-2">Acciones</th>
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
      )}
    </div>
  );
}
