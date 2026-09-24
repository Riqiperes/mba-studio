import { useState } from "react";
import { AcademyGroupFormModal } from "@/features/academy/components/AcademyGroupFormModal";
import { AcademyGroupsGrid } from "@/features/academy/components/AcademyGroupsGrid";
import { useAcademyGroups } from "@/features/academy/hooks/useAcademyGroups";
import type { AcademyGroupWithDetails, GroupInput } from "@/features/academy/types/AcademyGroup";
import { useInstructors } from "@/features/instructors/hooks/useInstructors";
import {
  listTuitionPeriodsByGroup,
  upsertTuitionPeriod,
} from "@/features/academy/services/academyTuitionService";

// Regla de negocio (business-rules.md): fecha de corte de colegiatura fija
// el dia 10 de cada mes para todos los grupos, no configurable por grupo.
const TUITION_DAY_OF_MONTH = 10;
import { BackButton } from "@/components/ui/BackButton";
import { buttonClasses } from "@/components/ui/buttonStyles";
import { Plus } from "lucide-react";
import { ScreenHeader } from "@/components/ui/ScreenHeader";

export function AcademyGroupsPage() {
  const { groups, loading, error, create, update } = useAcademyGroups();
  const { instructors } = useInstructors();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<AcademyGroupWithDetails | null>(null);
  const [editingTuitionCents, setEditingTuitionCents] = useState<number | null>(null);

  function openCreate() {
    setEditingGroup(null);
    setEditingTuitionCents(null);
    setModalOpen(true);
  }

  async function openEdit(group: AcademyGroupWithDetails) {
    setEditingGroup(group);
    const periods = await listTuitionPeriodsByGroup(group.id);
    setEditingTuitionCents(periods[0]?.amountCents ?? null);
    setModalOpen(true);
  }

  async function handleSubmit(input: GroupInput) {
    const group = editingGroup ? await update(editingGroup.id, input) : await create(input);
    await upsertTuitionPeriod({
      groupId: group.id,
      dayOfMonth: TUITION_DAY_OF_MONTH,
      amountCents: input.monthlyTuitionCents,
    });
  }

  return (
    <div id="academy-groups-page" className="mx-auto max-w-4xl p-6">
      <BackButton />
      <ScreenHeader
        eyebrow="Academia de Ballet"
        title="Academia"
        actions={
          <button type="button" onClick={openCreate} className={buttonClasses("primary", "md")}>
            <Plus className="h-[18px] w-[18px]" strokeWidth={1.8} aria-hidden="true" />
            Nuevo grupo
          </button>
        }
      />

      {error && <p role="alert" className="mb-4 flex items-start gap-2 rounded-control bg-suave px-3 py-2 text-pequeno text-alerta">{error}</p>}
      {loading && <p role="status" className="text-pequeno text-texto-suave">Cargando…</p>}
      {!loading && groups.length === 0 && (
        <p className="vacio">Todavía no hay grupos.</p>
      )}
      {!loading && groups.length > 0 && <AcademyGroupsGrid groups={groups} onEdit={openEdit} />}

      <AcademyGroupFormModal
        open={modalOpen}
        initialValue={editingGroup}
        initialMonthlyTuitionCents={editingTuitionCents}
        instructors={instructors}
        onClose={() => setModalOpen(false)}
        onSubmit={handleSubmit}
      />
    </div>
  );
}
