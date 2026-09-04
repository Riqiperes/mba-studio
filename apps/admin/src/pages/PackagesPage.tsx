import { useState } from "react";
import { PackageFormModal } from "@/features/packages/components/PackageFormModal";
import { PackagesGrid } from "@/features/packages/components/PackagesGrid";
import { usePackages } from "@/features/packages/hooks/usePackages";
import type { Package } from "@/features/packages/types/Package";
import { BackButton } from "@/components/ui/BackButton";

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
    <div id="packages-page" className="mx-auto max-w-3xl p-6">
      <BackButton />
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-brand-primary">Paquetes</h1>
        <button
          type="button"
          onClick={openCreate}
          className="rounded-md bg-brand-primary px-4 py-2 text-sm font-medium text-white hover:opacity-90"
        >
          Nuevo paquete
        </button>
      </div>

      {loading && <p className="text-sm text-gray-500">Cargando...</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}
      {actionError && <p className="text-sm text-red-600">{actionError}</p>}
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
