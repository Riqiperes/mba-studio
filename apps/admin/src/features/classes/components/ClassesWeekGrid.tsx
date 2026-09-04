// apps/admin/src/features/classes/components/ClassesWeekGrid.tsx
import { useNavigate } from "react-router-dom";
import type { Instructor } from "@/features/instructors/types/Instructor";
import type { StudioClass } from "../types/StudioClass";
import { formatDateKey, getWeekDays } from "../utils/weekUtils";

const DAY_LABELS = ["Domingo", "Lunes", "Martes", "Miercoles", "Jueves", "Viernes", "Sabado"];

type Props = {
  weekStart: Date;
  classes: StudioClass[];
  instructors: Instructor[];
  onEdit: (studioClass: StudioClass) => void;
  onCancel: (studioClass: StudioClass) => void;
};

export function ClassesWeekGrid({ weekStart, classes, instructors, onEdit, onCancel }: Props) {
  const navigate = useNavigate();
  const days = getWeekDays(weekStart);

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
    <div id="classes-week-grid" className="grid grid-cols-7 gap-2">
      {days.map((day, index) => {
        const key = formatDateKey(day);
        const dayClasses = classesByDay.get(key) ?? [];
        return (
          <div key={key} className="flex flex-col gap-2">
            <div className="text-center text-xs font-medium text-gray-500">
              {DAY_LABELS[index]}
              <br />
              {day.toLocaleDateString("es-MX", { day: "numeric", month: "short" })}
            </div>
            {dayClasses.length === 0 && <p className="text-center text-xs text-gray-300">—</p>}
            {dayClasses.map((studioClass) => (
              <div
                key={studioClass.id}
                onClick={() => navigate(`/classes/${studioClass.id}`)}
                className="cursor-pointer rounded-md border border-gray-200 p-2 text-xs hover:bg-gray-50"
              >
                <p className="font-medium text-gray-900">{studioClass.title}</p>
                <p className="text-gray-500">
                  {formatTime(studioClass.startsAt)}–{formatTime(studioClass.endsAt)}
                </p>
                <p className="text-gray-500">{instructorName(studioClass.instructorId)}</p>
                <p className="text-gray-400">Cupo {studioClass.maxCapacity}</p>
                <div className="mt-1 flex gap-2">
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      onEdit(studioClass);
                    }}
                    className="text-brand-primary hover:underline"
                  >
                    Editar
                  </button>
                  {studioClass.status === "SCHEDULED" && (
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        onCancel(studioClass);
                      }}
                      className="text-red-600 hover:underline"
                    >
                      Cancelar
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
}
