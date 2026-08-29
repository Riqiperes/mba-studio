import { useState } from "react";
import { ClassFiltersBar } from "@/features/classes/components/ClassFiltersBar";
import { ClassFormModal } from "@/features/classes/components/ClassFormModal";
import { ClassesTable } from "@/features/classes/components/ClassesTable";
import { useClasses } from "@/features/classes/hooks/useClasses";
import type { ClassFilters, StudioClass } from "@/features/classes/types/StudioClass";
import { useInstructors } from "@/features/instructors/hooks/useInstructors";

export function ClassesPage() {
  const [filters, setFilters] = useState<ClassFilters>({});
  const { classes, loading, error, create, update, cancel } = useClasses(filters);
  const { instructors } = useInstructors();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<StudioClass | null>(null);
  const [cancelError, setCancelError] = useState<string | null>(null);

  function openCreate() {
    setEditing(null);
    setModalOpen(true);
  }

  function openEdit(studioClass: StudioClass) {
    setEditing(studioClass);
    setModalOpen(true);
  }

  async function handleSubmit(input: {
    instructorId: string;
    title: string;
    startsAt: string;
    endsAt: string;
    maxCapacity: number;
  }) {
    if (editing) {
      await update(editing.id, input);
    } else {
      await create(input);
    }
  }

  async function handleCancel(studioClass: StudioClass) {
    setCancelError(null);
    try {
      await cancel(studioClass.id);
    } catch (err) {
      const message = err instanceof Error ? err.message : "No se pudo cancelar la clase.";
      setCancelError(message);
      console.error("[classes] cancelar fallo", err);
    }
  }

  return (
    <div id="classes-page" className="mx-auto max-w-4xl p-6">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-brand-primary">Clases</h1>
        <button
          type="button"
          onClick={openCreate}
          className="rounded-md bg-brand-primary px-4 py-2 text-sm font-medium text-white hover:opacity-90"
        >
          Nueva clase
        </button>
      </div>

      <ClassFiltersBar instructors={instructors} filters={filters} onChange={setFilters} />

      {loading && <p className="text-sm text-gray-500">Cargando...</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}
      {cancelError && <p className="text-sm text-red-600">{cancelError}</p>}
      {!loading && !error && (
        <ClassesTable
          classes={classes}
          instructors={instructors}
          onEdit={openEdit}
          onCancel={handleCancel}
        />
      )}

      <ClassFormModal
        open={modalOpen}
        initialValue={editing}
        instructors={instructors}
        onClose={() => setModalOpen(false)}
        onSubmit={handleSubmit}
      />
    </div>
  );
}
