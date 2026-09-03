import { useEffect, useState } from "react";
import { useAuth } from "@/features/auth/hooks/AuthProvider";
import {
  DependentFormModal,
  type DependentFormInput,
} from "@/features/dependents/components/DependentFormModal";
import { useAllDependents } from "@/features/dependents/hooks/useAllDependents";
import {
  createDependent,
  setDependentActive,
  updateDependent,
} from "@/features/dependents/services/dependentsService";
import type { Dependent } from "@/features/dependents/types/Dependent";
import { listCurrentMonthPaymentStatus } from "@/features/academy/services/academyTuitionService";
import { getErrorMessage } from "@/utils/getErrorMessage";
import { BackButton } from "@/components/ui/BackButton";

function calculateAge(birthDate: string | null): number | null {
  if (!birthDate) return null;
  const today = new Date();
  const birth = new Date(`${birthDate}T00:00:00`);
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}

export function StudentsPage() {
  const { profile } = useAuth();
  const { dependents, loading, error, reload } = useAllDependents();
  const [paymentStatus, setPaymentStatus] = useState<Map<string, boolean>>(new Map());
  const [modalOpen, setModalOpen] = useState(false);
  const [editingDependent, setEditingDependent] = useState<Dependent | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    listCurrentMonthPaymentStatus()
      .then(setPaymentStatus)
      .catch((err) => console.error("[students] listCurrentMonthPaymentStatus fallo", err));
  }, [dependents]);

  function openCreate() {
    setEditingDependent(null);
    setModalOpen(true);
  }

  function openRow(dependent: Dependent) {
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

  async function handleToggleActive() {
    if (!editingDependent) return;
    setActionError(null);
    try {
      await setDependentActive(editingDependent.id, !editingDependent.active);
      await reload();
    } catch (err) {
      setActionError(getErrorMessage(err, "No se pudo actualizar el alumno."));
      console.error("[students] setActive fallo", err);
      throw err;
    }
  }

  return (
    <div id="students-page" className="mx-auto max-w-3xl p-6">
      <BackButton />
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
      {!loading && !error && dependents.length === 0 && (
        <p className="text-sm text-gray-500">Todavia no hay alumnos.</p>
      )}
      {!loading && !error && dependents.length > 0 && (
        <table id="students-table" className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-gray-200 text-left text-gray-500">
              <th className="py-2">Nombre</th>
              <th className="py-2">Tutor</th>
              <th className="py-2">Edad</th>
            </tr>
          </thead>
          <tbody>
            {dependents.map((dependent) => {
              const paid = paymentStatus.get(dependent.id);
              return (
                <tr
                  key={dependent.id}
                  onClick={() => openRow(dependent)}
                  className={`cursor-pointer border-b border-gray-100 hover:opacity-80 ${
                    paid === true ? "bg-green-50" : paid === false ? "bg-red-50" : ""
                  }`}
                >
                  <td className="py-2">{dependent.fullName}</td>
                  <td className="py-2">{dependent.guardianName ?? "-"}</td>
                  <td className="py-2">{calculateAge(dependent.birthDate) ?? "-"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      <DependentFormModal
        open={modalOpen}
        initialValue={editingDependent}
        showGuardianFields={!editingDependent || !editingDependent.guardianId}
        onClose={() => setModalOpen(false)}
        onSubmit={handleSubmit}
        onToggleActive={editingDependent ? handleToggleActive : undefined}
      />
    </div>
  );
}
