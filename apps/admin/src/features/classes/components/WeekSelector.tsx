import { addWeeksLocal, formatDateKey, getWeekLabel, getWeekStart } from "../utils/weekUtils";

type Props = {
  selectedWeekStart: string; // YYYY-MM-DD (Domingo de la semana)
  onChange: (weekStart: string) => void;
};

export function WeekSelector({ selectedWeekStart, onChange }: Props) {
  const todayWeekStart = formatDateKey(getWeekStart(new Date()));

  function goToWeek(weeksOffset: number) {
    const current = new Date(`${selectedWeekStart}T00:00:00`);
    onChange(formatDateKey(addWeeksLocal(current, weeksOffset)));
  }

  return (
    <div id="week-selector" className="mb-4 flex items-center justify-between rounded-lg border border-gray-200 bg-white p-3">
      <button
        type="button"
        onClick={() => goToWeek(-1)}
        className="rounded-md p-2 text-gray-500 hover:bg-gray-100"
        aria-label="Semana anterior"
      >
        ←
      </button>

      <div className="flex items-center gap-3">
        <span className="font-medium text-gray-900">
          {getWeekLabel(new Date(`${selectedWeekStart}T00:00:00`))}
        </span>
        {selectedWeekStart !== todayWeekStart && (
          <button
            type="button"
            onClick={() => onChange(todayWeekStart)}
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
  );
}
