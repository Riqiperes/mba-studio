import { useState } from "react";
import { PackageFormModal } from "@/features/packages/components/PackageFormModal";
import { PackagesGrid } from "@/features/packages/components/PackagesGrid";
import { usePackages } from "@/features/packages/hooks/usePackages";
import type { Package } from "@/features/packages/types/Package";
import { BackButton } from "@/components/ui/BackButton";
import { buttonClasses } from "@/components/ui/buttonStyles";
import { Plus } from "lucide-react";
import { ScreenHeader } from "@/components/ui/ScreenHeader";

export function PackagesPage() {
  const { packages, loading, error, create, update, setActive, remove } = usePackages();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Package | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

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
    } else {
      await create(input);
    }
  }

  async function handleToggleActive(pkg: Package) {
    if (pkg.active && !window.confirm(`Desactivar el paquete "${pkg.name}"?`)) {
      return;
    }
    setActionError(null);
    try {
      await setActive(pkg.id, !pkg.active);
    } catch (err) {
      setActionError("No se pudo actualizar el paquete. Intenta de nuevo.");
      console.error("[packages] setActive fallo", err);
    }
  }

  async function handleDelete(pkg: Package) {
    if (!window.confirm(`Eliminar el paquete "${pkg.name}"? Esta accion no se puede deshacer.`)) {
      return;
    }
    setActionError(null);
    try {
      await remove(pkg.id);
    } catch (err) {
      if (err && typeof err === "object" && "code" in err && err.code === "23503") {
        setActionError(
          `No se puede eliminar "${pkg.name}": tiene compras asociadas. Usa Desactivar en su lugar.`,
        );
      } else {
        setActionError("No se pudo eliminar el paquete. Intenta de nuevo.");
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
      {error && <p role="alert" className="flex items-start gap-2 rounded-control bg-suave px-3 py-2 text-pequeno text-alerta">{error}</p>}
      {actionError && <p role="alert" className="flex items-start gap-2 rounded-control bg-suave px-3 py-2 text-pequeno text-alerta">{actionError}</p>}
      {!loading && !error && (
        <PackagesGrid
          packages={packages}
          onEdit={openEdit}
          onToggleActive={handleToggleActive}
          onDelete={handleDelete}
        />
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
