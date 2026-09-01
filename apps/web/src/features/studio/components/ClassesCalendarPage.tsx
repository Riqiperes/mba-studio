import { useState } from "react";
import { useStudioClasses } from "@/features/studio/hooks/useStudioClasses";
import { ClassesCalendar } from "@/features/studio/components/ClassesCalendar";
import { WeekSelector } from "@/features/studio/components/WeekSelector";
import type { ClassFilters } from "@/features/studio/types/StudioClass";

function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  return d;
}

function formatDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

export function ClassesCalendarPage() {
  const today = new Date();
  const todayWeekStart = formatDate(getWeekStart(today));
  const [weekStart, setWeekStart] = useState<string>(todayWeekStart);

  // Compute dateFrom (Monday) and dateTo (Sunday) from weekStart
  const dateFrom = weekStart;
  const dateTo = formatDate(addDays(new Date(weekStart + "T00:00:00"), 6));

  const filters: ClassFilters = { dateFrom, dateTo };
  const { classes, loading, error } = useStudioClasses(filters);

  return (
    <div id="classes-calendar-page" className="mx-auto max-w-5xl px-4 py-4 pb-24">
      <header className="mb-4">
        <h1 className="text-xl font-semibold text-brand-primary">Horario de clases</h1>
        <p className="mt-1 text-sm text-gray-600">
          Próximas clases de Pilates. Navega por semanas.
        </p>
      </header>

      <WeekSelector selectedWeekStart={weekStart} onChange={setWeekStart} />

      {error && (
        <div id="classes-error" className="mb-6 rounded-md bg-red-50 p-4 text-sm text-red-600">
          {error}
        </div>
      )}

      {loading ? (
        <div id="classes-loading" className="flex items-center justify-center py-12 text-gray-500">
          Cargando clases...
        </div>
      ) : (
        <ClassesCalendar classes={classes} />
      )}
    </div>
  );
}