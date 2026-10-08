/**
 * Ventana de cancelacion con reembolso de credito. Debe coincidir con
 * cancel_booking() (migracion 029). El servidor es quien decide de verdad si
 * devuelve el credito; esto solo sirve para avisar antes de confirmar.
 */
export const CANCELLATION_REFUND_WINDOW_HOURS = 8;

/** true si faltan menos de 8 horas para la clase (cancelar ya no reembolsa). */
export function isLateCancellation(classStartsAt: string, now: Date = new Date()): boolean {
  const hoursLeft = (new Date(classStartsAt).getTime() - now.getTime()) / 3_600_000;
  return hoursLeft < CANCELLATION_REFUND_WINDOW_HOURS;
}
