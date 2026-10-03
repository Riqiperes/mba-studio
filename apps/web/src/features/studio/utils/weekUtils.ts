// apps/web/src/features/studio/utils/weekUtils.ts

/** Retrocede al Domingo de la semana de `date` (0 = Domingo en JS Date). */
export function getWeekStart(date: Date): Date {
  const d = new Date(date);
  d.setDate(d.getDate() - d.getDay());
  return d;
}

/** YYYY-MM-DD en hora LOCAL (toISOString daba el dia UTC: despues de las 6 pm la semana se corria). */
export function formatWeekStartKey(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function addWeeks(date: Date, weeks: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + weeks * 7);
  return d;
}

/** "D mmm – D mmm" del rango de la semana (Domingo a Sabado). */
export function getWeekLabel(weekStart: Date): string {
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);
  const startStr = weekStart.toLocaleDateString("es-MX", { day: "numeric", month: "short" });
  const endStr = weekEnd.toLocaleDateString("es-MX", { day: "numeric", month: "short" });
  return `${startStr} – ${endStr}`;
}
