// Tipos de notificacion documentados en docs/notifications.md, mapeados al
// nombre de plantilla de WhatsApp que usara el provider real (Meta/Twilio/
// UltraMsg) cuando se implemente. El nombre exacto de cada plantilla se
// ajusta al aprobar plantillas con el proveedor elegido -- lo unico fijo
// por ahora es el tipo de evento de negocio.
export type NotificationType =
  | "PAYMENT_RECEIVED_ADMIN"
  | "PAYMENT_CONFIRMED_CUSTOMER"
  | "CLASS_REMINDER"
  | "TUITION_REMINDER"
  | "WAITLIST_SPOT_AVAILABLE"
  | "CLASS_CANCELLED"
  | "BOOKING_CANCELLED"
  | "CLASS_SCHEDULE_CHANGED"
  | "TUITION_OVERDUE"
  | "ENROLLMENT_WITHDRAWN";

export const NOTIFICATION_TEMPLATES: Record<NotificationType, string> = {
  PAYMENT_RECEIVED_ADMIN: "payment_received_admin",
  PAYMENT_CONFIRMED_CUSTOMER: "payment_confirmed_customer",
  CLASS_REMINDER: "class_reminder",
  TUITION_REMINDER: "tuition_reminder",
  WAITLIST_SPOT_AVAILABLE: "waitlist_spot_available",
  CLASS_CANCELLED: "class_cancelled",
  BOOKING_CANCELLED: "booking_cancelled",
  CLASS_SCHEDULE_CHANGED: "class_schedule_changed",
  TUITION_OVERDUE: "tuition_overdue",
  ENROLLMENT_WITHDRAWN: "enrollment_withdrawn",
};

export function isNotificationType(value: string): value is NotificationType {
  return value in NOTIFICATION_TEMPLATES;
}
