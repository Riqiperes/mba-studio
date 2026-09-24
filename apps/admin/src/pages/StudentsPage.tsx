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
import { buttonClasses } from "@/components/ui/buttonStyles";
import { Plus } from "lucide-react";
import { ScreenHeader } from "@/components/ui/ScreenHeader";

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
    <div id="students-page" className="mx-auto max-w-3xl p-4 sm:p-6">
      <BackButton />
      <ScreenHeader
        eyebrow="Academia de Ballet"
        title="Alumnos"
        actions={
          <button type="button" onClick={openCreate} className={buttonClasses("primary", "md")}>
            <Plus className="h-[18px] w-[18px]" strokeWidth={1.8} aria-hidden="true" />
            Nuevo alumno
          </button>
        }
      />

      {actionError && <p role="alert" className="mb-4 flex items-start gap-2 rounded-control bg-suave px-3 py-2 text-pequeno text-alerta">{actionError}</p>}
      {loading && <p role="status" className="text-pequeno text-texto-suave">Cargando…</p>}
      {error && <p role="alert" className="flex items-start gap-2 rounded-control bg-suave px-3 py-2 text-pequeno text-alerta">{error}</p>}
      {!loading && !error && dependents.length === 0 && (
        <p className="vacio">Todavía no hay alumnos.</p>
      )}
      {!loading && !error && dependents.length > 0 && (
        <div className="tabla-contenedor">
        <table id="students-table" className="tabla">
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Tutor</th>
                <th>Edad</th>
              </tr>
            </thead>
            <tbody>
              {dependents.map((dependent) => {
                const paid = paymentStatus.get(dependent.id);
                return (
                  <tr
                    key={dependent.id}
                    onClick={() => openRow(dependent)}
                    className={`cursor-pointer ${
                      paid === true ? "bg-exito/10" : paid === false ? "bg-alerta/10" : ""
                    }`}
                  >
                    <td>
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          openRow(dependent);
                        }}
                        className="text-start font-medium text-texto hover:text-acento"
                      >
                        {dependent.fullName}
                      </button>
                      {paid !== undefined && (
                        <span
                          className={`ms-2 inline-flex items-center gap-1.5 whitespace-nowrap rounded-full bg-tarjeta px-2 py-0.5 text-pequeno font-medium ${
                            paid ? "text-exito" : "text-alerta"
                          }`}
                        >
                          <span aria-hidden="true" className={`h-1.5 w-1.5 rounded-full ${paid ? "bg-exito" : "bg-alerta"}`} />
                          {paid ? "Pagado este mes" : "Pendiente este mes"}
                        </span>
                      )}
                    </td>
                    <td>{dependent.guardianName ?? "-"}</td>
                    <td>{calculateAge(dependent.birthDate) ?? "-"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
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
