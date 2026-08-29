import { useState } from "react";
import { InstructorFormModal } from "@/features/instructors/components/InstructorFormModal";
import { InstructorsTable } from "@/features/instructors/components/InstructorsTable";
import { useInstructors } from "@/features/instructors/hooks/useInstructors";
import type { Instructor } from "@/features/instructors/types/Instructor";

export function InstructorsPage() {
  const { instructors, loading, error, create, update, setActive } = useInstructors();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Instructor | null>(null);

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
      {!loading && !error && (
        <InstructorsTable
          instructors={instructors}
          onEdit={openEdit}
          onToggleActive={(instructor) => setActive(instructor.id, !instructor.active)}
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
