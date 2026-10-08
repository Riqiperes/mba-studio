import { BackButton } from "@/components/ui/BackButton";
import { AdminInviteForm } from "@/features/adminInvites/components/AdminInviteForm";
import { AdminInvitesTable } from "@/features/adminInvites/components/AdminInvitesTable";
import { useAdminInvites } from "@/features/adminInvites/hooks/useAdminInvites";
import type { AdminInvite } from "@/features/adminInvites/types/AdminInvite";
import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { getErrorMessage } from "@/utils/getErrorMessage";
import { useAppFeedback } from "@/components/ui/AppFeedbackContext";

export function AdminInvitesPage() {
  const { invites, loading, error, add, remove } = useAdminInvites();
  const { notify, confirm } = useAppFeedback();

  async function handleRemove(invite: AdminInvite) {
    const ok = await confirm({
      title: `¿Quitar la invitación de ${invite.email}?`,
      confirmLabel: "Quitar",
      tone: "danger",
    });
    if (!ok) return;
    try {
      await remove(invite.email);
      notify("Invitación quitada.");
    } catch (err) {
      notify(getErrorMessage(err, "No se pudo quitar la invitación."), "error");
      console.error("[adminInvites] remove fallo", err);
    }
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
      {error && <p role="alert" className="alerta-entra flex items-start gap-2 rounded-control bg-suave px-3 py-2 text-pequeno text-alerta">{error}</p>}
      {!loading && !error && (
        <div className="entra">
          <AdminInvitesTable invites={invites} onRemove={handleRemove} />
        </div>
      )}
    </div>
  );
}
