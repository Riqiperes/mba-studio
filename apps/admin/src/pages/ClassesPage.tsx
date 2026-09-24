import { useMemo, useState } from "react";
import { ClassFiltersBar } from "@/features/classes/components/ClassFiltersBar";
import { ClassFormModal } from "@/features/classes/components/ClassFormModal";
import { ClassesWeekGrid } from "@/features/classes/components/ClassesWeekGrid";
import { WeekSelector } from "@/features/classes/components/WeekSelector";
import { useClasses } from "@/features/classes/hooks/useClasses";
import type { ClassFilters, StudioClass } from "@/features/classes/types/StudioClass";
import { formatDateKey, getWeekDays, getWeekStart } from "@/features/classes/utils/weekUtils";
import { useInstructors } from "@/features/instructors/hooks/useInstructors";
import { Plus } from "lucide-react";
import { BackButton } from "@/components/ui/BackButton";
import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { LoadingState } from "@/components/ui/LoadingState";
import { FormMessages } from "@/components/ui/FormMessages";
import { getErrorMessage } from "@/utils/getErrorMessage";
import { buttonClasses } from "@/components/ui/buttonStyles";

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

  const { classes, loading, error, create, update, cancel, remove } = useClasses(filters);
  const { instructors, error: instructorsError } = useInstructors();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<StudioClass | null>(null);
  const [cancelError, setCancelError] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

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

  async function handleDelete(studioClass: StudioClass) {
    if (!window.confirm(`Eliminar la clase "${studioClass.title}"? Esta accion no se puede deshacer.`)) {
      return;
    }
    setDeleteError(null);
    try {
      await remove(studioClass.id);
    } catch (err) {
      setDeleteError(getErrorMessage(err, "No se pudo eliminar la clase. Intenta de nuevo."));
      console.error("[classes] eliminar fallo", err);
    }
  }

  return (
    <div id="classes-page" className="mx-auto max-w-5xl p-4 sm:p-6">
      <BackButton />
      <ScreenHeader
        eyebrow="Estudio"
        title="Clases"
        actions={
          <button type="button" onClick={openCreate} className={buttonClasses("primary", "md")}>
            <Plus className="h-[18px] w-[18px]" strokeWidth={1.8} aria-hidden="true" />
            Nueva clase
          </button>
        }
      />

      <WeekSelector selectedWeekStart={formatDateKey(weekStart)} onChange={(value) => setWeekStart(new Date(`${value}T00:00:00`))} />
      <ClassFiltersBar instructors={instructors} filters={instructorFilter} onChange={setInstructorFilter} />

      {loading && <LoadingState message="Cargando..." />}
      <FormMessages messages={[error, instructorsError, cancelError, deleteError]} />
      {!loading && !error && (
        <ClassesWeekGrid
          weekStart={weekStart}
          classes={classes}
          instructors={instructors}
          onEdit={openEdit}
          onCancel={handleCancel}
          onDelete={handleDelete}
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
