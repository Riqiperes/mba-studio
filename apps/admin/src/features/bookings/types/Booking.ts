/**
 * Forma en camelCase de una fila de `bookings` (ver
 * supabase/migrations/011_bookings.sql). El mapeo snake_case ->
 * camelCase vive en features/bookings/services/bookingsService.ts.
 */
export type Booking = {
  id: string;
  businessId: string;
  classId: string;
  /** null en reservas "No registrado" (solo nombre, ver guestName). */
  customerId: string | null;
  guestName: string | null;
  status: "CONFIRMED" | "CANCELLED";
  createdAt: string;
  updatedAt: string;
};

/**
 * Usado en la tabla de reservados de una clase, con el nombre del cliente
 * (o el guestName de un "No registrado") y sus condiciones medicas (null si
 * no tiene ninguna registrada).
 */
export type BookingWithCustomer = Booking & {
  customerName: string | null;
  customerMedicalConditions: string | null;
};
