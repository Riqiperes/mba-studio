// apps/web/src/features/bookings/hooks/useMyBookings.ts
import { useCallback, useEffect, useState } from "react";
import {
  listMyBookings,
  listMyBookingsCancelledByBusiness,
  listMyWaitlist,
  listMyWaitlistCancellationNotices,
} from "../services/bookingsService";
import type { ClassCancellationNotice } from "../types/ClassCancellationNotice";
import type { BookingWithClass } from "../types/Booking";
import type { WaitlistEntryWithClass } from "../types/WaitlistEntry";

export function useMyBookings() {
  const [bookings, setBookings] = useState<BookingWithClass[]>([]);
  const [waitlist, setWaitlist] = useState<WaitlistEntryWithClass[]>([]);
  const [cancelledByBusiness, setCancelledByBusiness] = useState<BookingWithClass[]>([]);
  const [waitlistCancellations, setWaitlistCancellations] = useState<ClassCancellationNotice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [bookingsData, waitlistData, cancelledData, waitlistCancelledData] = await Promise.all([
        listMyBookings(),
        listMyWaitlist(),
        // Solo es un aviso: si falla no debe tumbar "Mi horario"
        listMyBookingsCancelledByBusiness().catch((err: unknown) => {
          console.error("[bookings-web] cancelled by business fallo", err);
          return [];
        }),
        listMyWaitlistCancellationNotices().catch((err: unknown) => {
          console.error("[bookings-web] waitlist cancellation notices fallo", err);
          return [];
        }),
      ]);
      setBookings(bookingsData);
      setWaitlist(waitlistData);
      setCancelledByBusiness(cancelledData);
      setWaitlistCancellations(waitlistCancelledData);
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

  return { bookings, waitlist, cancelledByBusiness, waitlistCancellations, loading, error, reload };
}