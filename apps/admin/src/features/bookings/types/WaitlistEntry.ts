/**
 * Forma en camelCase de una fila de `waitlist` (ver
 * supabase/migrations/011_bookings.sql).
 */
export type WaitlistEntry = {
  id: string;
  businessId: string;
  classId: string;
  /** null en "No registrado" (solo nombre, ver guestName). */
  customerId: string | null;
  guestName: string | null;
  createdAt: string;
};

/** Usado en la tabla de lista de espera, con el nombre del cliente. */
export type WaitlistEntryWithCustomer = WaitlistEntry & { customerName: string | null };
