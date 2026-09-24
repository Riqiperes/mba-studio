import { useState } from "react";
import { InstructorFormModal } from "@/features/instructors/components/InstructorFormModal";
import { InstructorsTable } from "@/features/instructors/components/InstructorsTable";
import { useInstructors } from "@/features/instructors/hooks/useInstructors";
import type { Instructor } from "@/features/instructors/types/Instructor";
import { BackButton } from "@/components/ui/BackButton";
import { buttonClasses } from "@/components/ui/buttonStyles";
import { Plus } from "lucide-react";
import { ScreenHeader } from "@/components/ui/ScreenHeader";

export function InstructorsPage() {
  const { instructors, loading, error, create, update, setActive, remove } = useInstructors();
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

  async function handleDelete(instructor: Instructor) {
    if (!window.confirm(`Eliminar a ${instructor.fullName}? Esta accion no se puede deshacer.`)) {
      return;
    }
    setActionError(null);
    try {
      await remove(instructor.id);
    } catch (err) {
      if (err && typeof err === "object" && "code" in err && err.code === "23503") {
        setActionError(
          `No se puede eliminar a ${instructor.fullName}: tiene clases asociadas. Usa Desactivar en su lugar.`,
        );
      } else {
        setActionError("No se pudo eliminar el instructor. Intenta de nuevo.");
      }
      console.error("[instructors] delete fallo", err);
    }
  }

  return (
    <div id="instructors-page" className="mx-auto max-w-3xl p-4 sm:p-6">
      <BackButton />
      <ScreenHeader
        eyebrow="Estudio"
        title="Instructores"
        actions={
          <button type="button" onClick={openCreate} className={buttonClasses("primary", "md")}>
            <Plus className="h-[18px] w-[18px]" strokeWidth={1.8} aria-hidden="true" />
            Nuevo instructor
          </button>
        }
      />

      {loading && <p role="status" className="text-pequeno text-texto-suave">Cargando…</p>}
      {error && <p role="alert" className="flex items-start gap-2 rounded-control bg-suave px-3 py-2 text-pequeno text-alerta">{error}</p>}
      {actionError && <p role="alert" className="flex items-start gap-2 rounded-control bg-suave px-3 py-2 text-pequeno text-alerta">{actionError}</p>}
      {!loading && !error && (
        <InstructorsTable
          instructors={instructors}
          onEdit={openEdit}
          onToggleActive={handleToggleActive}
          onDelete={handleDelete}
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
