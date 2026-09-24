import { useState, useMemo, useCallback } from "react";
import { useStudioClasses } from "@/features/studio/hooks/useStudioClasses";
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
  const today = new Date();
  const todayWeekStart = formatWeekStartKey(getWeekStart(today));
  const [weekStart, setWeekStart] = useState<string>(todayWeekStart);

  // Calcula dateFrom (Domingo) y dateTo (Sabado) a partir de weekStart
  const dateFrom = weekStart;
  const dateTo = formatWeekStartKey(addDays(new Date(weekStart + "T00:00:00"), 6));

  const filters = useMemo<ClassFilters>(() => ({ dateFrom, dateTo }), [dateFrom, dateTo]);
  const { classes, loading, error } = useStudioClasses(filters);
  const { bookings, waitlist, loading: bookingsLoading, reload: reloadBookings } = useMyBookings();
  const { balance, loading: creditsLoading, reload: reloadCredits } = useMyCredits();

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

  // Count active bookings per class to compute capacity
  const bookingsCountByClass = useMemo(() => {
    const map = new Map<string, number>();
    bookings.forEach((b) => {
      map.set(b.classId, (map.get(b.classId) ?? 0) + 1);
    });
    return map;
  }, [bookings]);

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
  const handleBook = useCallback(async (classId: string) => {
    try {
      await bookClass(classId);
      await Promise.all([reloadBookings(), reloadCredits()]);
    } catch (err) {
      console.error("[classes] book fallo", err);
    }
  }, [reloadBookings, reloadCredits]);

  const handleCancel = useCallback(async (bookingId: string) => {
    try {
      await cancelBooking(bookingId);
      await Promise.all([reloadBookings(), reloadCredits()]);
    } catch (err) {
      console.error("[classes] cancel fallo", err);
    }
  }, [reloadBookings, reloadCredits]);

  const handleJoinWaitlist = useCallback(async (classId: string) => {
    try {
      await joinWaitlist(classId);
      await reloadBookings();
    } catch (err) {
      console.error("[classes] join waitlist fallo", err);
    }
  }, [reloadBookings]);

  const handleLeaveWaitlist = useCallback(async (waitlistId: string) => {
    try {
      await leaveWaitlist(waitlistId);
      await reloadBookings();
    } catch (err) {
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

      <WeekSelector selectedWeekStart={weekStart} onChange={setWeekStart} />

      {error && (
        <div className="mb-6">
          <ErrorState id="classes-error" message={error} />
        </div>
      )}

      {isLoading ? (
        <LoadingState id="classes-loading" message="Cargando clases…" />
      ) : (
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
      )}
    </div>
  );
}
