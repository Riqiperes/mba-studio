import { useState, useEffect } from "react";

type Props = {
  selectedWeekStart: string; // YYYY-MM-DD (Monday of the week)
  onChange: (weekStart: string) => void;
};

function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay(); // 0 = Sunday, 1 = Monday, etc.
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust to Monday
  d.setDate(diff);
  return d;
}

function formatDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function addWeeks(date: Date, weeks: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + weeks * 7);
  return d;
}

function getWeekLabel(weekStart: Date): string {
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);
  
  const startStr = weekStart.toLocaleDateString("es-MX", { day: "numeric", month: "short" });
  const endStr = weekEnd.toLocaleDateString("es-MX", { day: "numeric", month: "short" });
  
  return `${startStr} – ${endStr}`;
}

export function WeekSelector({ selectedWeekStart, onChange }: Props) {
  const [currentWeekStart, setCurrentWeekStart] = useState(selectedWeekStart);

  useEffect(() => {
    setCurrentWeekStart(selectedWeekStart);
  }, [selectedWeekStart]);

  const today = new Date();
  const todayWeekStart = formatDate(getWeekStart(today));

  const goToToday = () => {
    onChange(todayWeekStart);
  };

  const goToWeek = (weeksOffset: number) => {
    const current = new Date(currentWeekStart + "T00:00:00");
    const newWeek = addWeeks(current, weeksOffset);
    onChange(formatDate(newWeek));
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