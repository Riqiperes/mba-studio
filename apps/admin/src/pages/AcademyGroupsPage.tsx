import { useState } from "react";
import { Link } from "react-router-dom";
import { AcademyGroupFormModal } from "@/features/academy/components/AcademyGroupFormModal";
import { useAcademyGroups } from "@/features/academy/hooks/useAcademyGroups";
import type { AcademyGroupWithDetails, GroupInput } from "@/features/academy/types/AcademyGroup";
import { useInstructors } from "@/features/instructors/hooks/useInstructors";
import { BackButton } from "@/components/ui/BackButton";

const DAY_ABBREVIATIONS = ["Dom", "Lun", "Mar", "Mie", "Jue", "Vie", "Sab"];

function formatSchedule(group: AcademyGroupWithDetails): string {
  if (group.schedules.length === 0) return "Sin horario";
  return group.schedules
    .map((s) => `${DAY_ABBREVIATIONS[s.dayOfWeek]} ${s.startTime.slice(0, 5)}-${s.endTime.slice(0, 5)}`)
    .join(", ");
}

export function AcademyGroupsPage() {
  const { groups, loading, error, create, update } = useAcademyGroups();
  const { instructors } = useInstructors();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<AcademyGroupWithDetails | null>(null);

  function openCreate() {
    setEditingGroup(null);
    setModalOpen(true);
  }

  function openEdit(group: AcademyGroupWithDetails) {
    setEditingGroup(group);
    setModalOpen(true);
  }

  async function handleSubmit(input: GroupInput) {
    if (editingGroup) {
      await update(editingGroup.id, input);
    } else {
      await create(input);
    }
  }

  return (
    <div id="academy-groups-page" className="mx-auto max-w-4xl p-6">
      <BackButton />
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-brand-primary">Academia</h1>
        <button
          type="button"
          onClick={openCreate}
          className="rounded-md bg-brand-primary px-4 py-2 text-sm font-medium text-white hover:opacity-90"
        >
          Nuevo grupo
        </button>
      </div>

      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}
      {loading && <p className="text-sm text-gray-500">Cargando...</p>}
      {!loading && groups.length === 0 && (
        <p className="text-sm text-gray-500">Todavia no hay grupos.</p>
      )}
      {!loading && groups.length > 0 && (
        <table id="academy-groups-table" className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-gray-200 text-left text-gray-500">
              <th className="py-2">Nombre</th>
              <th className="py-2">Instructor</th>
              <th className="py-2">Horario</th>
              <th className="py-2">Inscritos</th>
              <th className="py-2">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {groups.map((group) => (
              <tr key={group.id} className="border-b border-gray-100">
                <td className="py-2">{group.name}</td>
                <td className="py-2">{group.instructorName ?? "-"}</td>
                <td className="py-2">{formatSchedule(group)}</td>
                <td className="py-2">{group.enrolledCount}</td>
                <td className="py-2">
                  <Link
                    to={`/academy/groups/${group.id}`}
                    className="mr-3 text-brand-primary hover:underline"
                  >
                    Ver alumnos
                  </Link>
                  <button
                    type="button"
                    onClick={() => openEdit(group)}
                    className="text-brand-primary hover:underline"
                  >
                    Editar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <AcademyGroupFormModal
        open={modalOpen}
        initialValue={editingGroup}
        instructors={instructors}
        onClose={() => setModalOpen(false)}
        onSubmit={handleSubmit}
      />
    </div>
  );
}
