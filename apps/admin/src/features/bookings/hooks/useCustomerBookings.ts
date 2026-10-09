import { useEffect, useState } from "react";
import { listBookingsByCustomer } from "../services/bookingsService";
import type { CustomerBooking } from "../types/Booking";

export function useCustomerBookings(customerId: string) {
  const [bookings, setBookings] = useState<CustomerBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!customerId) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    listBookingsByCustomer(customerId)
      .then((data) => {
        if (!cancelled) setBookings(data);
      })
      .catch((err) => {
        if (!cancelled) setError("No se pudieron cargar las reservaciones.");
        console.error("[bookings] listBookingsByCustomer fallo", err);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [customerId]);

  return { bookings, loading, error };
}
