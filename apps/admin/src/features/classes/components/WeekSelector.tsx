import type { CSSProperties } from "react";
import { addWeeksLocal, formatDateKey, getWeekLabel, getWeekStart } from "../utils/weekUtils";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { buttonClasses } from "@/components/ui/buttonStyles";

const arrowClasses =
  "grid h-10 w-10 shrink-0 place-items-center rounded-full border border-borde bg-tarjeta text-texto transition-[background-color,scale] duration-200 ease-(--ease-brand) hover:bg-acento-suave hover:text-acento active:scale-[0.96]";

type Props = {
  selectedWeekStart: string; // YYYY-MM-DD (Domingo de la semana)
  onChange: (weekStart: string) => void;
  /** Direccion del ultimo cambio de semana (1 = avanza, -1 = retrocede), para que la etiqueta deslice junto con la grilla. */
  direction?: 1 | -1;
};

export function WeekSelector({ selectedWeekStart, onChange, direction = 1 }: Props) {
  const todayWeekStart = formatDateKey(getWeekStart(new Date()));

  function goToWeek(weeksOffset: number) {
    const current = new Date(`${selectedWeekStart}T00:00:00`);
    onChange(formatDateKey(addWeeksLocal(current, weeksOffset)));
  }

  return (
    <div id="week-selector" className="mb-4 flex items-center justify-between gap-3 rounded-card border border-borde bg-tarjeta p-3 shadow-card">
      <button type="button" onClick={() => goToWeek(-1)} className={arrowClasses} aria-label="Semana anterior">
        <ChevronLeft className="h-5 w-5" strokeWidth={1.6} aria-hidden="true" />
      </button>

      <div className="flex min-w-0 flex-wrap items-center justify-center gap-x-3 gap-y-1">
        <span
          key={selectedWeekStart}
          aria-live="polite"
          className="semana-entra font-display text-subtitulo font-medium tabular-nums text-texto"
          style={{ "--dir": direction } as CSSProperties}
        >
          {getWeekLabel(new Date(`${selectedWeekStart}T00:00:00`))}
        </span>
        {selectedWeekStart !== todayWeekStart && (
          <button type="button" onClick={() => onChange(todayWeekStart)} className={buttonClasses("soft", "sm")}>
            Hoy
          </button>
        )}
      </div>

      <button type="button" onClick={() => goToWeek(1)} className={arrowClasses} aria-label="Semana siguiente">
        <ChevronRight className="h-5 w-5" strokeWidth={1.6} aria-hidden="true" />
      </button>
    </div>
  );
}
