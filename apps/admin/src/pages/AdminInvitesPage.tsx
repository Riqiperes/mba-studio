import { BackButton } from "@/components/ui/BackButton";
import { AdminInviteForm } from "@/features/adminInvites/components/AdminInviteForm";
import { AdminInvitesTable } from "@/features/adminInvites/components/AdminInvitesTable";
import { useAdminInvites } from "@/features/adminInvites/hooks/useAdminInvites";
import type { AdminInvite } from "@/features/adminInvites/types/AdminInvite";
import { ScreenHeader } from "@/components/ui/ScreenHeader";

export function AdminInvitesPage() {
  const { invites, loading, error, add, remove } = useAdminInvites();

  async function handleRemove(invite: AdminInvite) {
    if (!window.confirm(`Quitar la invitacion de ${invite.email}?`)) {
      return;
    }
    await remove(invite.email);
  }

  return (
    <div id="admin-invites-page" className="mx-auto max-w-3xl p-4 sm:p-6">
      <BackButton />
      <ScreenHeader
        eyebrow="Administración"
        title="Admins"
        lead={
          <>
            Da acceso al panel a un correo antes de que se registre. Al iniciar sesión con Google por
            primera vez, recibe automáticamente el rol asignado aquí. Para cambiar el rol de alguien
            que ya se registró, usa la página Usuarios.
          </>
        }
      />

      <AdminInviteForm onSubmit={add} />

      {loading && <p role="status" className="text-pequeno text-texto-suave">Cargando…</p>}
      {error && <p role="alert" className="flex items-start gap-2 rounded-control bg-suave px-3 py-2 text-pequeno text-alerta">{error}</p>}
      {!loading && !error && <AdminInvitesTable invites={invites} onRemove={handleRemove} />}
    </div>
  );
}
