// apps/admin/src/features/classes/components/ClassesWeekGrid.tsx
import { Link } from "react-router-dom";
import type { Instructor } from "@/features/instructors/types/Instructor";
import type { StudioClass } from "../types/StudioClass";
import { formatDateKey, getWeekDays } from "../utils/weekUtils";

const DAY_LABELS = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

type Props = {
  weekStart: Date;
  classes: StudioClass[];
  instructors: Instructor[];
  onEdit: (studioClass: StudioClass) => void;
  onCancel: (studioClass: StudioClass) => void;
  onDelete: (studioClass: StudioClass) => void;
};

const actionClasses =
  "relative z-10 inline-flex min-h-8 items-center rounded-chip px-1.5 text-pequeno font-medium transition-colors duration-200 hover:bg-suave";

export function ClassesWeekGrid({ weekStart, classes, instructors, onEdit, onCancel, onDelete }: Props) {
  const days = getWeekDays(weekStart);
  const todayKey = formatDateKey(new Date());

  function instructorName(instructorId: string): string {
    return instructors.find((i) => i.id === instructorId)?.fullName ?? "—";
  }

  function formatTime(iso: string): string {
    return new Date(iso).toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" });
  }

  const classesByDay = new Map<string, StudioClass[]>();
  for (const day of days) classesByDay.set(formatDateKey(day), []);
  for (const studioClass of classes) {
    const key = formatDateKey(new Date(studioClass.startsAt));
    classesByDay.get(key)?.push(studioClass);
  }
  for (const dayClasses of classesByDay.values()) {
    dayClasses.sort((a, b) => a.startsAt.localeCompare(b.startsAt));
  }

  return (
    <div id="classes-week-grid" className="grid gap-4 lg:grid-cols-7 lg:gap-2">
      {days.map((day, index) => {
        const key = formatDateKey(day);
        const dayClasses = classesByDay.get(key) ?? [];
        const isToday = key === todayKey;
        return (
          <section key={key} aria-label={`${DAY_LABELS[index]} ${day.toLocaleDateString("es-MX", { day: "numeric", month: "long" })}`} className="flex flex-col gap-2">
            <h2
              className={`flex items-baseline gap-2 rounded-control px-2 py-1.5 lg:flex-col lg:items-center lg:gap-0 lg:text-center ${
                isToday ? "bg-acento text-sobre-acento" : "text-texto"
              }`}
            >
              <span className={`text-pequeno font-medium ${isToday ? "" : "text-texto-suave"}`}>{DAY_LABELS[index]}</span>
              <span className="font-display text-subtitulo tabular-nums">
                {day.toLocaleDateString("es-MX", { day: "numeric", month: "short" })}
              </span>
            </h2>
            {dayClasses.length === 0 && <p className="px-2 text-pequeno text-texto-suave lg:text-center">—</p>}
            {dayClasses.map((studioClass) => {
              const isCancelled = studioClass.status !== "SCHEDULED";
              return (
                <article
                  key={studioClass.id}
                  className={`relative rounded-control border bg-tarjeta p-2.5 text-pequeno shadow-card transition-colors duration-200 hover:border-acento/40 ${
                    isCancelled ? "border-dashed border-borde opacity-75" : "border-borde"
                  }`}
                >
                  <Link
                    to={`/classes/${studioClass.id}`}
                    className="font-medium text-texto after:absolute after:inset-0 after:rounded-control after:content-['']"
                  >
                    {studioClass.title}
                  </Link>
                  <p className="tabular-nums text-texto-suave">
                    {formatTime(studioClass.startsAt)}–{formatTime(studioClass.endsAt)}
                  </p>
                  <p className="text-texto-suave">{instructorName(studioClass.instructorId)}</p>
                  <p className="text-texto-suave">Cupo {studioClass.maxCapacity}</p>
                  {isCancelled && <p className="mt-1 font-medium text-alerta">Cancelada</p>}
                  <div className="mt-1.5 -ms-1.5 flex flex-wrap gap-x-1">
                    <button type="button" onClick={() => onEdit(studioClass)} className={`${actionClasses} text-acento`}>
                      Editar
                    </button>
                    {studioClass.status === "SCHEDULED" && (
                      <button type="button" onClick={() => onCancel(studioClass)} className={`${actionClasses} text-alerta`}>
                        Cancelar
                      </button>
                    )}
                    <button type="button" onClick={() => onDelete(studioClass)} className={`${actionClasses} text-alerta`}>
                      Eliminar
                    </button>
                  </div>
                </article>
              );
            })}
          </section>
        );
      })}
    </div>
  );
}
