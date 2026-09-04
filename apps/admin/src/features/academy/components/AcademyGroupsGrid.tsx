import { useNavigate } from "react-router-dom";
import type { AcademyGroupWithDetails } from "../types/AcademyGroup";

const DAY_ABBREVIATIONS = ["Dom", "Lun", "Mar", "Mie", "Jue", "Vie", "Sab"];

function formatSchedule(group: AcademyGroupWithDetails): string {
  if (group.schedules.length === 0) return "Sin horario";
  return group.schedules
    .map((s) => `${DAY_ABBREVIATIONS[s.dayOfWeek]} ${s.startTime.slice(0, 5)}-${s.endTime.slice(0, 5)}`)
    .join(", ");
}

function formatAgeRange(group: AcademyGroupWithDetails): string {
  if (group.ageMin == null && group.ageMax == null) return "Todas las edades";
  if (group.ageMin != null && group.ageMax != null) return `${group.ageMin}-${group.ageMax} anos`;
  if (group.ageMin != null) return `Desde ${group.ageMin} anos`;
  return `Hasta ${group.ageMax} anos`;
}

type Props = {
  groups: AcademyGroupWithDetails[];
  onEdit: (group: AcademyGroupWithDetails) => void;
};

export function AcademyGroupsGrid({ groups, onEdit }: Props) {
  const navigate = useNavigate();

  if (groups.length === 0) {
    return <p className="text-sm text-gray-500">Todavia no hay grupos.</p>;
  }

  return (
    <div id="academy-groups-grid" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {groups.map((group) => {
        const fillPercent = Math.min(100, Math.round((group.enrolledCount / group.maxCapacity) * 100));
        return (
          <article
            key={group.id}
            id={`academy-group-card-${group.id}`}
            onClick={() => navigate(`/academy/groups/${group.id}`)}
            className="flex cursor-pointer flex-col gap-2 rounded-lg border border-gray-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-md"
          >
            <h3 className="text-lg font-semibold text-brand-primary">{group.name}</h3>
            <p className="text-sm text-gray-600">{group.instructorName ?? "Sin instructor"}</p>
            <p className="text-sm text-gray-600">{formatSchedule(group)}</p>
            <p className="text-sm text-gray-600">{formatAgeRange(group)}</p>

            <div className="mt-2">
              <div className="mb-1 flex items-center justify-between text-xs text-gray-500">
                <span>Cupo</span>
                <span>
                  {group.enrolledCount}/{group.maxCapacity}
                </span>
              </div>
              <div className="h-1.5 w-full rounded-full bg-gray-100">
                <div
                  className="h-1.5 rounded-full bg-brand-primary"
                  style={{ width: `${fillPercent}%` }}
                />
              </div>
            </div>

            <div className="mt-2 flex items-center justify-between border-t border-gray-100 pt-3">
              <span className="text-sm text-brand-primary">Ver alumnos</span>
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  onEdit(group);
                }}
                className="text-sm text-gray-600 hover:underline"
              >
                Editar
              </button>
            </div>
          </article>
        );
      })}
    </div>
  );
}
