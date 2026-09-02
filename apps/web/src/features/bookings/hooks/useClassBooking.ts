// apps/web/src/features/bookings/hooks/useClassBooking.ts
import { useState } from "react";
import {
  bookClass,
  cancelBooking,
  joinWaitlist,
  leaveWaitlist,
} from "../services/bookingsService";

export function useClassBooking(classId: string) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function getErrorMessage(err: unknown, fallback: string): string {
    if (err && typeof err === "object" && "message" in err) {
      return String((err as { message: unknown }).message);
    }
    return fallback;
  }

  async function book() {
    setLoading(true);
    setError(null);
    try {
      await bookClass(classId);
    } catch (err) {
      setError(getErrorMessage(err, "No se pudo reservar la clase."));
      throw err;
    } finally {
      setLoading(false);
    }
  }

  async function cancel(bookingId: string) {
    setLoading(true);
    setError(null);
    try {
      await cancelBooking(bookingId);
    } catch (err) {
      setError(getErrorMessage(err, "No se pudo cancelar la reservación."));
      throw err;
    } finally {
      setLoading(false);
    }
  }

  async function joinWaitlistAction() {
    setLoading(true);
    setError(null);
    try {
      await joinWaitlist(classId);
    } catch (err) {
      setError(getErrorMessage(err, "No se pudo unir a la lista de espera."));
      throw err;
    } finally {
      setLoading(false);
    }
  }

  async function leaveWaitlistAction(waitlistId: string) {
    setLoading(true);
    setError(null);
    try {
      await leaveWaitlist(waitlistId);
    } catch (err) {
      setError(getErrorMessage(err, "No se pudo salir de la lista de espera."));
      throw err;
    } finally {
      setLoading(false);
    }
  }

  return { book, cancel, joinWaitlist: joinWaitlistAction, leaveWaitlist: leaveWaitlistAction, loading, error };
}