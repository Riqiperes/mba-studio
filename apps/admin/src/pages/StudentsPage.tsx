import { useState } from "react";
import { useAuth } from "@/features/auth/hooks/AuthProvider";
import {
  DependentFormModal,
  type DependentFormInput,
} from "@/features/dependents/components/DependentFormModal";
import { DependentsTable } from "@/features/dependents/components/DependentsTable";
import { useAllDependents } from "@/features/dependents/hooks/useAllDependents";
import {
  createDependent,
  setDependentActive,
  updateDependent,
} from "@/features/dependents/services/dependentsService";
import type { Dependent } from "@/features/dependents/types/Dependent";
import { getErrorMessage } from "@/utils/getErrorMessage";

export function StudentsPage() {
  const { profile } = useAuth();
  const { dependents, loading, error, reload } = useAllDependents();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingDependent, setEditingDependent] = useState<Dependent | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  function openCreate() {
    setEditingDependent(null);
    setModalOpen(true);
  }

  function openEdit(dependent: Dependent) {
    setEditingDependent(dependent);
    setModalOpen(true);
  }

  async function handleSubmit(input: DependentFormInput) {
    if (!profile) throw new Error("Falta el perfil del usuario actual.");
    if (editingDependent) {
      await updateDependent(editingDependent.id, {
        fullName: input.fullName,
        birthDate: input.birthDate ?? null,
        guardianName: input.guardianName ?? null,
        guardianPhone: input.guardianPhone ?? null,
      });
    } else {
      await createDependent(profile.businessId, {
        fullName: input.fullName,
        birthDate: input.birthDate ?? null,
        guardianName: input.guardianName ?? null,
        guardianPhone: input.guardianPhone ?? null,
      });
    }
    await reload();
  }

  async function handleToggleActive(dependent: Dependent) {
    if (dependent.active && !window.confirm(`Desactivar al alumno "${dependent.fullName}"?`)) {
      return;
    }
    setActionError(null);
    try {
      await setDependentActive(dependent.id, !dependent.active);
      await reload();
    } catch (err) {
      setActionError(getErrorMessage(err, "No se pudo actualizar el alumno."));
      console.error("[students] setActive fallo", err);
    }
  }

  return (
    <div id="students-page" className="mx-auto max-w-3xl p-6">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-brand-primary">Alumnos</h1>
        <button
          type="button"
          onClick={openCreate}
          className="rounded-md bg-brand-primary px-4 py-2 text-sm font-medium text-white hover:opacity-90"
        >
          Nuevo alumno
        </button>
      </div>

      {actionError && <p className="mb-4 text-sm text-red-600">{actionError}</p>}
      {loading && <p className="text-sm text-gray-500">Cargando...</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}
      {!loading && !error && (
        <DependentsTable
          dependents={dependents}
          showGuardianColumn
          onEdit={openEdit}
          onToggleActive={handleToggleActive}
        />
      )}

      <DependentFormModal
        open={modalOpen}
        initialValue={editingDependent}
        showGuardianFields={!editingDependent || !editingDependent.guardianId}
        onClose={() => setModalOpen(false)}
        onSubmit={handleSubmit}
      />
    </div>
  );
}

