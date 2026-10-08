import { CANCELLATION_REFUND_WINDOW_HOURS } from "@mba-studio/shared";
import type { ConfirmOptions } from "@/components/ui/AppFeedbackContext";

/** Texto del modal de confirmacion segun si aun se devuelve el credito. */
export function bookingCancellationConfirm(classTitle: string, late: boolean): ConfirmOptions {
  if (late) {
    return {
      title: "Se consumirá tu crédito",
      description: `Faltan menos de ${CANCELLATION_REFUND_WINDOW_HOURS} horas para "${classTitle}". Si cancelas ahora, el crédito no se devuelve.`,
      confirmLabel: "Sí, cancelar",
      cancelLabel: "No, conservar",
      tone: "danger",
    };
  }
  return {
    title: "¿Cancelar esta reservación?",
    description: `Se cancelará tu lugar en "${classTitle}" y el crédito regresará a tu saldo.`,
    confirmLabel: "Cancelar reservación",
    cancelLabel: "No, conservar",
    tone: "danger",
  };
}

/** Toast de exito tras cancelar, coherente con lo que se aviso antes. */
export function bookingCancelledMessage(late: boolean): string {
  return late
    ? `Reservación cancelada. El crédito no se devolvió por cancelar con menos de ${CANCELLATION_REFUND_WINDOW_HOURS} horas.`
    : "Reservación cancelada. El crédito regresó a tu saldo.";
}
