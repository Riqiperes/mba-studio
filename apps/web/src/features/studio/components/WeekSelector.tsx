import { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { addWeeks, formatWeekStartKey, getWeekLabel, getWeekStart } from "../utils/weekUtils";
import { buttonClasses } from "@/components/ui/buttonStyles";

type Props = {
  selectedWeekStart: string; // YYYY-MM-DD (Domingo de la semana)
  onChange: (weekStart: string) => void;
};

const arrowClasses =
  "grid h-10 w-10 shrink-0 place-items-center rounded-full border border-borde bg-tarjeta text-texto transition-[background-color,scale] duration-200 ease-(--ease-brand) hover:bg-acento-suave hover:text-acento active:scale-[0.96]";

export function WeekSelector({ selectedWeekStart, onChange }: Props) {
  const [currentWeekStart, setCurrentWeekStart] = useState(selectedWeekStart);

  useEffect(() => {
    setCurrentWeekStart(selectedWeekStart);
  }, [selectedWeekStart]);

  const today = new Date();
  const todayWeekStart = formatWeekStartKey(getWeekStart(today));

  const goToToday = () => {
    onChange(todayWeekStart);
  };

  const goToWeek = (weeksOffset: number) => {
    const current = new Date(currentWeekStart + "T00:00:00");
    const newWeek = addWeeks(current, weeksOffset);
    onChange(formatWeekStartKey(newWeek));
  };

  return (
    <div id="week-selector" className="mb-6 flex items-center justify-between gap-3 rounded-card border border-borde bg-tarjeta p-3 shadow-card sm:p-4">
      <button type="button" onClick={() => goToWeek(-1)} className={arrowClasses} aria-label="Semana anterior">
        <ChevronLeft className="h-5 w-5" strokeWidth={1.6} aria-hidden="true" />
      </button>

      <div className="flex min-w-0 flex-wrap items-center justify-center gap-x-3 gap-y-1">
        <span aria-live="polite" className="font-display text-subtitulo font-medium tabular-nums text-texto">
          {getWeekLabel(new Date(currentWeekStart + "T00:00:00"))}
        </span>

        {currentWeekStart !== todayWeekStart && (
          <button type="button" onClick={goToToday} className={buttonClasses("soft", "sm")}>
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
