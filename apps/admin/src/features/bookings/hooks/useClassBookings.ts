import { useCallback, useEffect, useState } from "react";
import {
  addToWaitlist,
  bookClass,
  cancelBooking,
  listBookingsByClass,
  listWaitlistByClass,
  promoteFromWaitlist,
  removeFromWaitlist,
} from "../services/bookingsService";
import type { BookingWithCustomer } from "../types/Booking";
import type { WaitlistEntryWithCustomer } from "../types/WaitlistEntry";

export function useClassBookings(classId: string, businessId: string) {
  const [bookings, setBookings] = useState<BookingWithCustomer[]>([]);
  const [waitlist, setWaitlist] = useState<WaitlistEntryWithCustomer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [bookingsData, waitlistData] = await Promise.all([
        listBookingsByClass(classId),
        listWaitlistByClass(classId),
      ]);
      setBookings(bookingsData);
      setWaitlist(waitlistData);
    } catch (err) {
      setError("No se pudieron cargar las reservaciones.");
      console.error("[bookings] reload fallo", err);
    } finally {
      setLoading(false);
    }
  }, [classId]);

  useEffect(() => {
    reload();
  }, [reload]);

  async function book(customerId: string) {
    await bookClass(customerId, classId);
    await reload();
  }

  async function cancel(bookingId: string) {
    await cancelBooking(bookingId);
    await reload();
  }

  async function addWaiting(customerId: string) {
    if (!businessId) throw new Error("Falta el business_id de la clase.");
    await addToWaitlist(businessId, classId, customerId);
    await reload();
  }

  async function removeWaiting(id: string) {
    await removeFromWaitlist(id);
    await reload();
  }

  async function promote(waitlistId: string) {
    await promoteFromWaitlist(waitlistId);
    await reload();
  }

  return { bookings, waitlist, loading, error, reload, book, cancel, addWaiting, removeWaiting, promote };
}
