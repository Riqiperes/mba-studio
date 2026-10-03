export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("es-MX", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

export function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString("es-MX", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

export function formatDateKey(dateStr: string): string {
  return new Date(dateStr).toISOString().slice(0, 10);
}
/** "7:00" y "a. m." por separado, para columnas de hora en tarjetas. */
export function formatTimeParts(dateStr: string): { time: string; period: string } {
  const formatted = new Date(dateStr).toLocaleTimeString("es-MX", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
  const [time = formatted, ...rest] = formatted.split(/\s/);
  return { time, period: rest.join(" ") };
}
