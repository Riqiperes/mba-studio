import { useState } from "react";
import { PackageFormModal } from "@/features/packages/components/PackageFormModal";
import { PackagesGrid } from "@/features/packages/components/PackagesGrid";
import { usePackages } from "@/features/packages/hooks/usePackages";
import type { Package } from "@/features/packages/types/Package";
import { BackButton } from "@/components/ui/BackButton";
import { buttonClasses } from "@/components/ui/buttonStyles";
import { Plus } from "lucide-react";
import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { useAppFeedback } from "@/components/ui/AppFeedbackContext";

export function PackagesPage() {
  const { packages, loading, error, create, update, setActive, remove } = usePackages();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Package | null>(null);
  const { notify, confirm } = useAppFeedback();

  function openCreate() {
    setEditing(null);
    setModalOpen(true);
  }

  function openEdit(pkg: Package) {
    setEditing(pkg);
    setModalOpen(true);
  }

  async function handleSubmit(input: {
    name: string;
    description?: string | null;
    credits: number;
    price: number;
    validDays?: number | null;
  }) {
    if (editing) {
      await update(editing.id, input);
      notify("Paquete actualizado.");
    } else {
      await create(input);
      notify("Paquete creado.");
    }
  }

  async function handleToggleActive(pkg: Package) {
    if (
      pkg.active &&
      !(await confirm({ title: `¿Desactivar el paquete "${pkg.name}"?`, description: "Dejará de mostrarse a los clientes.", confirmLabel: "Desactivar", tone: "danger" }))
    ) {
      return;
    }
    try {
      await setActive(pkg.id, !pkg.active);
      notify(pkg.active ? "Paquete desactivado." : "Paquete activado.");
    } catch (err) {
      notify("No se pudo actualizar el paquete. Intenta de nuevo.", "error");
      console.error("[packages] setActive fallo", err);
    }
  }

  async function handleDelete(pkg: Package) {
    const ok = await confirm({
      title: `¿Eliminar el paquete "${pkg.name}"?`,
      description: "Esta acción no se puede deshacer.",
      confirmLabel: "Eliminar",
      tone: "danger",
    });
    if (!ok) return;
    try {
      await remove(pkg.id);
      notify("Paquete eliminado.");
    } catch (err) {
      if (err && typeof err === "object" && "code" in err && err.code === "23503") {
        notify(
          `No se puede eliminar "${pkg.name}": tiene compras asociadas. Usa Desactivar en su lugar.`,
          "error",
        );
      } else {
        notify("No se pudo eliminar el paquete. Intenta de nuevo.", "error");
      }
      console.error("[packages] delete fallo", err);
    }
  }

  return (
    <div id="packages-page" className="mx-auto max-w-3xl p-4 sm:p-6">
      <BackButton />
      <ScreenHeader
        eyebrow="Estudio"
        title="Paquetes"
        actions={
          <button type="button" onClick={openCreate} className={buttonClasses("primary", "md")}>
            <Plus className="h-[18px] w-[18px]" strokeWidth={1.8} aria-hidden="true" />
            Nuevo paquete
          </button>
        }
      />

      {loading && <p role="status" className="text-pequeno text-texto-suave">Cargando…</p>}
      {error && <p role="alert" className="alerta-entra flex items-start gap-2 rounded-control bg-suave px-3 py-2 text-pequeno text-alerta">{error}</p>}
      {!loading && !error && (
        <div className="entra">
          <PackagesGrid
            packages={packages}
            onEdit={openEdit}
            onToggleActive={handleToggleActive}
            onDelete={handleDelete}
          />
        </div>
      )}

      <PackageFormModal
        open={modalOpen}
        initialValue={editing}
        onClose={() => setModalOpen(false)}
        onSubmit={handleSubmit}
      />
    </div>
  );
}
