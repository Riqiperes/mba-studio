// apps/admin/src/features/classes/utils/weekUtils.ts

/** Retrocede al Domingo de la semana de `date` (0 = Domingo en JS Date). */
export function getWeekStart(date: Date): Date {
  const d = new Date(date);
  d.setDate(d.getDate() - d.getDay());
  return d;
}

/** Las 7 fechas de la semana, Domingo a Sabado, empezando en `weekStart`. */
export function getWeekDays(weekStart: Date): Date[] {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    return d;
  });
}

/** "D mmm – D mmm" del rango de la semana. */
export function getWeekLabel(weekStart: Date): string {
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);
  const startStr = weekStart.toLocaleDateString("es-MX", { day: "numeric", month: "short" });
  const endStr = weekEnd.toLocaleDateString("es-MX", { day: "numeric", month: "short" });
  return `${startStr} – ${endStr}`;
}

/** YYYY-MM-DD en hora local (para agrupar clases por dia y comparar semanas). */
export function formatDateKey(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function addWeeksLocal(date: Date, weeks: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + weeks * 7);
  return d;
}
