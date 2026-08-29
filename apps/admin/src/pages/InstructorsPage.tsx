import { useState } from "react";
import { InstructorFormModal } from "@/features/instructors/components/InstructorFormModal";
import { InstructorsTable } from "@/features/instructors/components/InstructorsTable";
import { useInstructors } from "@/features/instructors/hooks/useInstructors";
import type { Instructor } from "@/features/instructors/types/Instructor";

export function InstructorsPage() {
  const { instructors, loading, error, create, update, setActive } = useInstructors();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Instructor | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  function openCreate() {
    setEditing(null);
    setModalOpen(true);
  }

  function openEdit(instructor: Instructor) {
    setEditing(instructor);
    setModalOpen(true);
  }

  async function handleSubmit(input: { fullName: string; bio?: string | null; photoUrl?: string | null }) {
    if (editing) {
      await update(editing.id, input);
    } else {
      await create(input);
    }
  }

  async function handleToggleActive(instructor: Instructor) {
    if (instructor.active && !window.confirm(`Desactivar a ${instructor.fullName}?`)) {
      return;
    }
    setActionError(null);
    try {
      await setActive(instructor.id, !instructor.active);
    } catch (err) {
      setActionError("No se pudo actualizar el instructor. Intenta de nuevo.");
      console.error("[instructors] setActive fallo", err);
    }
  }

  return (
    <div id="instructors-page" className="mx-auto max-w-3xl p-6">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-brand-primary">Instructores</h1>
        <button
          type="button"
          onClick={openCreate}
          className="rounded-md bg-brand-primary px-4 py-2 text-sm font-medium text-white hover:opacity-90"
        >
          Nuevo instructor
        </button>
      </div>

      {loading && <p className="text-sm text-gray-500">Cargando...</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}
      {actionError && <p className="text-sm text-red-600">{actionError}</p>}
      {!loading && !error && (
        <InstructorsTable
          instructors={instructors}
          onEdit={openEdit}
          onToggleActive={handleToggleActive}
        />
      )}

      <InstructorFormModal
        open={modalOpen}
        initialValue={editing}
        onClose={() => setModalOpen(false)}
        onSubmit={handleSubmit}
      />
    </div>
  );
}
