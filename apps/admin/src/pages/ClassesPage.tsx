import { useMemo, useState } from "react";
import { ClassFiltersBar } from "@/features/classes/components/ClassFiltersBar";
import { ClassFormModal } from "@/features/classes/components/ClassFormModal";
import { ClassesWeekGrid } from "@/features/classes/components/ClassesWeekGrid";
import { WeekSelector } from "@/features/classes/components/WeekSelector";
import { useClasses } from "@/features/classes/hooks/useClasses";
import type { ClassFilters, StudioClass } from "@/features/classes/types/StudioClass";
import { formatDateKey, getWeekDays, getWeekStart } from "@/features/classes/utils/weekUtils";
import { useInstructors } from "@/features/instructors/hooks/useInstructors";
import { BackButton } from "@/components/ui/BackButton";

export function ClassesPage() {
  const [instructorFilter, setInstructorFilter] = useState<ClassFilters>({});
  const [weekStart, setWeekStart] = useState<Date>(() => getWeekStart(new Date()));

  const filters = useMemo<ClassFilters>(() => {
    const days = getWeekDays(weekStart);
    return {
      ...instructorFilter,
      dateFrom: formatDateKey(days[0]!),
      dateTo: formatDateKey(days[6]!),
    };
  }, [instructorFilter, weekStart]);

  const { classes, loading, error, create, update, cancel } = useClasses(filters);
  const { instructors, error: instructorsError } = useInstructors();
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

  async function handleCancel(studioClass: StudioClass) {
    if (!window.confirm(`Cancelar la clase "${studioClass.title}"?`)) {
      return;
    }
    setCancelError(null);
    try {
      await cancel(studioClass.id);
    } catch (err) {
      setCancelError("No se pudo cancelar la clase. Intenta de nuevo.");
      console.error("[classes] cancelar fallo", err);
    }
  }

  return (
    <div id="classes-page" className="mx-auto max-w-5xl p-6">
      <BackButton />
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

      <WeekSelector selectedWeekStart={formatDateKey(weekStart)} onChange={(value) => setWeekStart(new Date(`${value}T00:00:00`))} />
      <ClassFiltersBar instructors={instructors} filters={instructorFilter} onChange={setInstructorFilter} />

      {loading && <p className="text-sm text-gray-500">Cargando...</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}
      {instructorsError && <p className="text-sm text-red-600">{instructorsError}</p>}
      {cancelError && <p className="text-sm text-red-600">{cancelError}</p>}
      {!loading && !error && (
        <ClassesWeekGrid
          weekStart={weekStart}
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
        weekStart={weekStart}
        onClose={() => setModalOpen(false)}
        onCreate={create}
        onUpdate={update}
      />
    </div>
  );
}
