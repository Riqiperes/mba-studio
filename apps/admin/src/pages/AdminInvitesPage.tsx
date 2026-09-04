import { BackButton } from "@/components/ui/BackButton";
import { AdminInviteForm } from "@/features/adminInvites/components/AdminInviteForm";
import { AdminInvitesTable } from "@/features/adminInvites/components/AdminInvitesTable";
import { useAdminInvites } from "@/features/adminInvites/hooks/useAdminInvites";
import type { AdminInvite } from "@/features/adminInvites/types/AdminInvite";

export function AdminInvitesPage() {
  const { invites, loading, error, add, remove } = useAdminInvites();

  async function handleRemove(invite: AdminInvite) {
    if (!window.confirm(`Quitar la invitacion de ${invite.email}?`)) {
      return;
    }
    await remove(invite.email);
  }

  return (
    <div id="admin-invites-page" className="mx-auto max-w-3xl p-6">
      <BackButton />
      <h1 className="mb-2 text-xl font-semibold text-brand-primary">Admins</h1>
      <p className="mb-4 text-sm text-gray-500">
        Da acceso al panel a un correo antes de que se registre. Al iniciar sesion con Google por
        primera vez, recibe automaticamente el rol asignado aqui. Para cambiar el rol de alguien
        que ya se registro, usa la pagina Usuarios.
      </p>

      <AdminInviteForm onSubmit={add} />

      {loading && <p className="text-sm text-gray-500">Cargando...</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}
      {!loading && !error && <AdminInvitesTable invites={invites} onRemove={handleRemove} />}
    </div>
  );
}
