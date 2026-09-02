// apps/web/src/features/bookings/hooks/useMyBookings.ts
import { useCallback, useEffect, useState } from "react";
import { listMyBookings, listMyWaitlist } from "../services/bookingsService";
import type { BookingWithClass } from "../types/Booking";
import type { WaitlistEntryWithClass } from "../types/WaitlistEntry";

export function useMyBookings() {
  const [bookings, setBookings] = useState<BookingWithClass[]>([]);
  const [waitlist, setWaitlist] = useState<WaitlistEntryWithClass[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [bookingsData, waitlistData] = await Promise.all([
        listMyBookings(),
        listMyWaitlist(),
      ]);
      setBookings(bookingsData);
      setWaitlist(waitlistData);
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

  return { bookings, waitlist, loading, error, reload };
}