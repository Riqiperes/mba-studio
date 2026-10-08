import { useMemo, useState, type CSSProperties } from "react";
import { ClassFiltersBar } from "@/features/classes/components/ClassFiltersBar";
import { ClassActionsModal } from "@/features/classes/components/ClassActionsModal";
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
import { useAppFeedback } from "@/components/ui/AppFeedbackContext";

export function ClassesPage() {
  const [instructorFilter, setInstructorFilter] = useState<ClassFilters>({});
  const [weekStart, setWeekStart] = useState<Date>(() => getWeekStart(new Date()));
  const [weekDirection, setWeekDirection] = useState<1 | -1>(1);

  function handleWeekChange(value: string) {
    const next = new Date(`${value}T00:00:00`);
    setWeekDirection(next.getTime() >= weekStart.getTime() ? 1 : -1);
    setWeekStart(next);
  }

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
  const { notify, confirm } = useAppFeedback();
  const [selectedClass, setSelectedClass] = useState<StudioClass | null>(null);

  function openCreate() {
    setEditing(null);
    setModalOpen(true);
  }

  function openEdit(studioClass: StudioClass) {
    setEditing(studioClass);
    setModalOpen(true);
  }

  async function handleCancel(studioClass: StudioClass) {
    const ok = await confirm({
      title: `¿Cancelar la clase "${studioClass.title}"?`,
      description: "La clase quedará marcada como cancelada.",
      confirmLabel: "Cancelar clase",
      tone: "danger",
    });
    if (!ok) return;
    try {
      await cancel(studioClass.id);
      notify("Clase cancelada.");
    } catch (err) {
      notify(getErrorMessage(err, "No se pudo cancelar la clase. Intenta de nuevo."), "error");
      console.error("[classes] cancelar fallo", err);
    }
  }

  async function handleDelete(studioClass: StudioClass) {
    const ok = await confirm({
      title: `¿Eliminar la clase "${studioClass.title}"?`,
      description: "Esta acción no se puede deshacer.",
      confirmLabel: "Eliminar clase",
      tone: "danger",
    });
    if (!ok) return;
    try {
      await remove(studioClass.id);
      notify("Clase eliminada.");
    } catch (err) {
      notify(getErrorMessage(err, "No se pudo eliminar la clase. Intenta de nuevo."), "error");
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

      <WeekSelector selectedWeekStart={formatDateKey(weekStart)} onChange={handleWeekChange} direction={weekDirection} />
      <ClassFiltersBar instructors={instructors} filters={instructorFilter} onChange={setInstructorFilter} />

      {loading && <LoadingState message="Cargando..." />}
      <FormMessages messages={[error, instructorsError]} />
      {!loading && !error && (
        <div
          key={formatDateKey(weekStart)}
          className="semana-entra"
          style={{ "--dir": weekDirection } as CSSProperties}
        >
          <ClassesWeekGrid
            weekStart={weekStart}
            classes={classes}
            instructors={instructors}
            onEdit={openEdit}
            onCancel={handleCancel}
            onDelete={handleDelete}
            onOpen={setSelectedClass}
          />
        </div>
      )}

      <ClassActionsModal
        studioClass={selectedClass}
        instructorName={instructors.find((i) => i.id === selectedClass?.instructorId)?.fullName ?? "—"}
        onClose={() => setSelectedClass(null)}
        onEdit={openEdit}
        onCancel={handleCancel}
        onDelete={handleDelete}
      />

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
