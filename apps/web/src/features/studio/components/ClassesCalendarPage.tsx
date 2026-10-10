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
import { useAppFeedback } from "@/components/ui/AppFeedbackContext";
import { isLateCancellation } from "@mba-studio/shared";
import { bookingCancellationConfirm, bookingCancelledMessage } from "@/features/bookings/utils/bookingCancellationPolicy";
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
  const { notify, confirm } = useAppFeedback();

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
        bookedCount: currentCount,
        bookingId: myBooking?.id ?? null,
      };

      return { ...cls, bookingState };
    });
  }, [classes, bookingsByClass, waitlistByClass, bookingsCountByClass]);

  const hasCredits = (balance ?? 0) > 0;
  const isLoading = loading || bookingsLoading || creditsLoading;

  // Cada accion confirma lo que va a pasar con el credito y avisa el
  // resultado con un toast (antes los errores solo iban a consola).
  const handleBook = useCallback(async (classId: string) => {
    const cls = classes.find((item) => item.id === classId);
    const ok = await confirm({
      title: "¿Reservar esta clase?",
      description: `Se usará 1 crédito para reservar "${cls?.title ?? "la clase"}".`,
      confirmLabel: "Reservar",
    });
    if (!ok) return;
    try {
      await bookClass(classId);
      notify("Clase reservada. Se descontó 1 crédito.");
    } catch (err) {
      notify(getErrorMessage(err, "No se pudo reservar."), "error");
      console.error("[classes] book fallo", err);
    }
    await Promise.all([reloadBookings(), reloadCredits(), reloadCounts()]);
  }, [classes, confirm, notify, reloadBookings, reloadCredits, reloadCounts]);

  const handleCancel = useCallback(async (bookingId: string) => {
    const booking = bookings.find((item) => item.id === bookingId);
    const late = booking ? isLateCancellation(booking.class.startsAt) : false;
    if (!(await confirm(bookingCancellationConfirm(booking?.class.title ?? "la clase", late)))) return;
    try {
      await cancelBooking(bookingId);
      notify(bookingCancelledMessage(late), late ? "info" : "success");
      await Promise.all([reloadBookings(), reloadCredits(), reloadCounts()]);
    } catch (err) {
      notify(getErrorMessage(err, "No se pudo cancelar."), "error");
      console.error("[classes] cancel fallo", err);
    }
  }, [bookings, confirm, notify, reloadBookings, reloadCredits, reloadCounts]);

  const handleJoinWaitlist = useCallback(async (classId: string, businessId: string) => {
    try {
      await joinWaitlist(classId, businessId);
      notify("Te uniste a la lista de espera. Te avisaremos si se libera un lugar.");
      await reloadBookings();
    } catch (err) {
      notify(getErrorMessage(err, "No se pudo unir a la lista de espera."), "error");
      console.error("[classes] join waitlist fallo", err);
    }
  }, [notify, reloadBookings]);

  const handleLeaveWaitlist = useCallback(async (waitlistId: string) => {
    const ok = await confirm({ title: "¿Salir de la lista de espera?", confirmLabel: "Salir", tone: "danger" });
    if (!ok) return;
    try {
      await leaveWaitlist(waitlistId);
      notify("Saliste de la lista de espera.");
      await reloadBookings();
    } catch (err) {
      notify(getErrorMessage(err, "No se pudo salir de la lista de espera."), "error");
      console.error("[classes] leave waitlist fallo", err);
    }
  }, [confirm, notify, reloadBookings]);

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
