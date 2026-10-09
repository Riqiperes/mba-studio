// apps/web/src/features/bookings/hooks/useMyBookings.ts
import { useCallback, useEffect, useState } from "react";
import { listMyBookings, listMyBookingsCancelledByBusiness, listMyWaitlist } from "../services/bookingsService";
import type { BookingWithClass } from "../types/Booking";
import type { WaitlistEntryWithClass } from "../types/WaitlistEntry";

export function useMyBookings() {
  const [bookings, setBookings] = useState<BookingWithClass[]>([]);
  const [waitlist, setWaitlist] = useState<WaitlistEntryWithClass[]>([]);
  const [cancelledByBusiness, setCancelledByBusiness] = useState<BookingWithClass[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [bookingsData, waitlistData, cancelledData] = await Promise.all([
        listMyBookings(),
        listMyWaitlist(),
        // Solo es un aviso: si falla no debe tumbar "Mi horario"
        listMyBookingsCancelledByBusiness().catch((err: unknown) => {
          console.error("[bookings-web] cancelled by business fallo", err);
          return [];
        }),
      ]);
      setBookings(bookingsData);
      setWaitlist(waitlistData);
      setCancelledByBusiness(cancelledData);
    } catch (err) {
      setError("No se pudieron cargar tus reservaciones.");
      console.error("[bookings-web] reload fallo", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  return { bookings, waitlist, cancelledByBusiness, loading, error, reload };
}