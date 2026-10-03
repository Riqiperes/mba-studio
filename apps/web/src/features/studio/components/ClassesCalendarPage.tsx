import { useState, useMemo, useCallback, type CSSProperties } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/features/auth/hooks/AuthProvider";
import { buttonClasses } from "@/components/ui/buttonStyles";
import { useStudioClasses } from "@/features/studio/hooks/useStudioClasses";
import { useClassBookingCounts } from "@/features/studio/hooks/useClassBookingCounts";
import { getErrorMessage } from "@/utils/getErrorMessage";
import { useMyBookings } from "@/features/bookings/hooks/useMyBookings";
import { useMyCredits } from "@/features/credits/hooks/useMyCredits";
import { ClassesCalendar } from "@/features/studio/components/ClassesCalendar";
import { WeekSelector } from "@/features/studio/components/WeekSelector";
import type { ClassFilters } from "@/features/studio/types/StudioClass";
import type { ClassBookingState } from "@/features/studio/components/ClassesCalendar";
import { bookClass, cancelBooking, joinWaitlist, leaveWaitlist } from "@/features/bookings/services/bookingsService";
import type { BookingWithClass } from "@/features/bookings/types/Booking";
import type { WaitlistEntryWithClass } from "@/features/bookings/types/WaitlistEntry";
import { BackButton } from "@/components/ui/BackButton";
import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { LoadingState } from "@/components/ui/LoadingState";
import { ErrorState } from "@/components/ui/ErrorState";
import { formatWeekStartKey, getWeekStart } from "@/features/studio/utils/weekUtils";

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

export function ClassesCalendarPage() {
  const { session } = useAuth();
  const today = new Date();
  const todayWeekStart = formatWeekStartKey(getWeekStart(today));
  const [weekStart, setWeekStart] = useState<string>(todayWeekStart);
  const [weekDirection, setWeekDirection] = useState<1 | -1>(1);

  function handleWeekChange(value: string) {
    setWeekDirection(value >= weekStart ? 1 : -1);
    setWeekStart(value);
  }

  // Calcula dateFrom (Domingo) y dateTo (Sabado) a partir de weekStart
  const dateFrom = weekStart;
  const dateTo = formatWeekStartKey(addDays(new Date(weekStart + "T00:00:00"), 6));

  const filters = useMemo<ClassFilters>(() => ({ dateFrom, dateTo }), [dateFrom, dateTo]);
  const { classes, loading, error } = useStudioClasses(filters);
  const { bookings, waitlist, loading: bookingsLoading, reload: reloadBookings } = useMyBookings();
  const { balance, loading: creditsLoading, reload: reloadCredits } = useMyCredits();
  const classIds = useMemo(() => classes.map((cls) => cls.id), [classes]);
  const { counts: bookingsCountByClass, reload: reloadCounts } = useClassBookingCounts(classIds);
  const [actionError, setActionError] = useState<string | null>(null);

  // Build lookup maps
  const bookingsByClass = useMemo(() => {
    const map = new Map<string, BookingWithClass>();
    bookings.forEach((b) => map.set(b.classId, b));
    return map;
  }, [bookings]);

  const waitlistByClass = useMemo(() => {
    const map = new Map<string, WaitlistEntryWithClass>();
    waitlist.forEach((w) => map.set(w.classId, w));
    return map;
  }, [waitlist]);

  // Merge booking state into classes
  const classesWithState = useMemo(() => {
    return classes.map((cls) => {
      const myBooking = bookingsByClass.get(cls.id);
      const myWaitlist = waitlistByClass.get(cls.id);
      const currentCount = bookingsCountByClass.get(cls.id) ?? 0;
      const hasCapacity = currentCount < cls.maxCapacity;

      const bookingState: ClassBookingState = {
        isBooked: !!myBooking,
        isWaitlisted: !!myWaitlist,
        waitlistId: myWaitlist?.id ?? null,
        waitlistPosition: myWaitlist?.position ?? null,
        hasCapacity,
        bookingId: myBooking?.id ?? null,
      };

      return { ...cls, bookingState };
    });
  }, [classes, bookingsByClass, waitlistByClass, bookingsCountByClass]);

  const hasCredits = (balance ?? 0) > 0;
  const isLoading = loading || bookingsLoading || creditsLoading;

  // Action handlers - use service functions directly
  // Antes los errores solo iban a consola (ej. "clase llena"): ahora se muestran.
  const handleBook = useCallback(async (classId: string) => {
    setActionError(null);
    try {
      await bookClass(classId);
    } catch (err) {
      setActionError(getErrorMessage(err, "No se pudo reservar."));
      console.error("[classes] book fallo", err);
    }
    await Promise.all([reloadBookings(), reloadCredits(), reloadCounts()]);
  }, [reloadBookings, reloadCredits, reloadCounts]);

  const handleCancel = useCallback(async (bookingId: string) => {
    if (!window.confirm("¿Cancelar esta reservación? Si faltan menos de 8 horas para la clase, el crédito no se devuelve.")) return;
    setActionError(null);
    try {
      await cancelBooking(bookingId);
      await Promise.all([reloadBookings(), reloadCredits(), reloadCounts()]);
    } catch (err) {
      setActionError(getErrorMessage(err, "No se pudo cancelar."));
      console.error("[classes] cancel fallo", err);
    }
  }, [reloadBookings, reloadCredits, reloadCounts]);

  const handleJoinWaitlist = useCallback(async (classId: string, businessId: string) => {
    setActionError(null);
    try {
      await joinWaitlist(classId, businessId);
      await reloadBookings();
    } catch (err) {
      setActionError(getErrorMessage(err, "No se pudo unir a la lista de espera."));
      console.error("[classes] join waitlist fallo", err);
    }
  }, [reloadBookings]);

  const handleLeaveWaitlist = useCallback(async (waitlistId: string) => {
    setActionError(null);
    try {
      await leaveWaitlist(waitlistId);
      await reloadBookings();
    } catch (err) {
      setActionError(getErrorMessage(err, "No se pudo salir de la lista de espera."));
      console.error("[classes] leave waitlist fallo", err);
    }
  }, [reloadBookings]);

  return (
    <div id="classes-calendar-page" className="mx-auto max-w-[980px] px-4 py-6 sm:px-8 sm:py-8">
      <BackButton />
      <ScreenHeader
        eyebrow="Estudio de Pilates"
        title="Horario de clases"
        lead="Próximas clases de Pilates. Navega por semanas."
      />

      {session && (
        <Link id="classes-my-bookings-link" to="/my-bookings" className={`${buttonClasses("soft", "sm")} mb-6`}>
          Ver mi horario
        </Link>
      )}

      <WeekSelector selectedWeekStart={weekStart} onChange={handleWeekChange} direction={weekDirection} />

      {error && (
        <div className="mb-6">
          <ErrorState id="classes-error" message={error} />
        </div>
      )}
      {actionError && (
        <div className="mb-6">
          <ErrorState id="classes-action-error" message={actionError} />
        </div>
      )}

      {isLoading ? (
        <LoadingState id="classes-loading" message="Cargando clases…" />
      ) : (
        <div key={weekStart} className="semana-entra" style={{ "--dir": weekDirection } as CSSProperties}>
          <ClassesCalendar
            classes={classesWithState}
            onBook={handleBook}
            onCancel={handleCancel}
            onJoinWaitlist={handleJoinWaitlist}
            onLeaveWaitlist={handleLeaveWaitlist}
            hasCredits={hasCredits}
            loading={isLoading}
            weekStart={weekStart}
          />
        </div>
      )}
    </div>
  );
}
