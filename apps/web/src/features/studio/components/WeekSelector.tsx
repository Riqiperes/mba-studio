import { useState, useEffect } from "react";
import { addWeeks, formatWeekStartKey, getWeekLabel, getWeekStart } from "../utils/weekUtils";

type Props = {
  selectedWeekStart: string; // YYYY-MM-DD (Domingo de la semana)
  onChange: (weekStart: string) => void;
};

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
    <div id="week-selector" className="mb-6 flex flex-col gap-3 rounded-lg border border-gray-200 bg-white p-4">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => goToWeek(-1)}
          className="rounded-md p-2 text-gray-500 hover:bg-gray-100"
          aria-label="Semana anterior"
        >
          ←
        </button>
        
        <div className="flex items-center gap-3">
          <span className="font-medium text-gray-900">{getWeekLabel(new Date(currentWeekStart + "T00:00:00"))}</span>
          
          {currentWeekStart !== todayWeekStart && (
            <button
              type="button"
              onClick={goToToday}
              className="rounded-md bg-brand-primary px-3 py-1 text-xs font-medium text-white hover:opacity-90"
            >
              Hoy
            </button>
          )}
        </div>
        
        <button
          type="button"
          onClick={() => goToWeek(1)}
          className="rounded-md p-2 text-gray-500 hover:bg-gray-100"
          aria-label="Semana siguiente"
        >
          →
        </button>
      </div>
    </div>
  );
}