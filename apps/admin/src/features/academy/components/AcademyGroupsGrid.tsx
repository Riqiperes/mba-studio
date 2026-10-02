import { Link } from "react-router-dom";
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

  if (groups.length === 0) {
    return <p className="vacio">Todavía no hay grupos.</p>;
  }

  return (
    <div id="academy-groups-grid" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {groups.map((group) => {
        const fillPercent = Math.min(100, Math.round((group.enrolledCount / group.maxCapacity) * 100));
        return (
          <article
            key={group.id}
            id={`academy-group-card-${group.id}`}
            className="relative flex flex-col gap-2 rounded-card border border-borde bg-tarjeta p-6 shadow-card transition-colors duration-200 hover:border-acento/40"
          >
            <h3 className="font-display text-subtitulo font-medium text-texto">
              {/* Toda la tarjeta lleva al grupo (como antes); ahora tambien con teclado */}
              <Link
                to={`/academy/groups/${group.id}`}
                className="after:absolute after:inset-0 after:rounded-card after:content-['']"
              >
                {group.name}
              </Link>
            </h3>
            <p className="text-sm text-texto-suave">{group.instructorName ?? "Sin instructor"}</p>
            <p className="text-sm text-texto-suave">{formatSchedule(group)}</p>
            <p className="text-sm text-texto-suave">{formatAgeRange(group)}</p>

            <div className="mt-2">
              <div className="mb-1 flex items-center justify-between text-pequeno text-texto-suave">
                <span>Cupo</span>
                <span>
                  {group.enrolledCount}/{group.maxCapacity}
                </span>
              </div>
              <div className="h-1.5 w-full rounded-full bg-suave">
                <div
                  className="h-1.5 rounded-full bg-acento"
                  style={{ width: `${fillPercent}%` }}
                />
              </div>
            </div>

            <div className="mt-2 flex items-center justify-between border-t border-borde pt-3">
              <span className="text-pequeno font-medium text-acento">Ver alumnos</span>
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  onEdit(group);
                }}
                className="accion relative z-10 text-texto-suave"
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
