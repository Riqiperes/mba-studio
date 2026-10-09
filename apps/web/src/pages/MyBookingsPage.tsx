// apps/web/src/pages/MyBookingsPage.tsx
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { CalendarX } from "lucide-react";
import { useMyBookings } from "@/features/bookings/hooks/useMyBookings";
import { useMyCredits } from "@/features/credits/hooks/useMyCredits";
import { BookingCard } from "@/features/bookings/components/BookingCard";
import { WaitlistCard } from "@/features/bookings/components/WaitlistCard";
import { CreditsBadge } from "@/features/credits/components/CreditsBadge";
import { BackButton } from "@/components/ui/BackButton";
import { LoadingState } from "@/components/ui/LoadingState";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { buttonClasses } from "@/components/ui/buttonStyles";
import { formatDate, formatTime } from "@/utils/dateUtils";
import { useAppFeedback } from "@/components/ui/AppFeedbackContext";
import { getErrorMessage } from "@/utils/getErrorMessage";
import { isLateCancellation } from "@mba-studio/shared";
import { bookingCancellationConfirm, bookingCancelledMessage } from "@/features/bookings/utils/bookingCancellationPolicy";

export function MyBookingsPage() {
  const { bookings, waitlist, cancelledByBusiness, loading, error, reload } = useMyBookings();
  const { balance, loading: creditsLoading, reload: reloadCredits } = useMyCredits();

  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const { notify, confirm } = useAppFeedback();

  useEffect(() => {
    reload();
    reloadCredits();
  }, [reload, reloadCredits]);

  async function handleCancel(bookingId: string) {
    const booking = bookings.find((item) => item.id === bookingId);
    const late = booking ? isLateCancellation(booking.class.startsAt) : false;
    if (!(await confirm(bookingCancellationConfirm(booking?.class.title ?? "la clase", late)))) return;
    setActionLoading(bookingId);
    try {
      const { cancelBooking } = await import("@/features/bookings/services/bookingsService");
      await cancelBooking(bookingId);
      notify(bookingCancelledMessage(late), late ? "info" : "success");
      await reload();
      await reloadCredits();
    } catch (err) {
      notify(getErrorMessage(err, "No se pudo cancelar la reservación."), "error");
      console.error("[my-bookings] cancel fallo", err);
    } finally {
      setActionLoading(null);
    }
  }

  async function handleLeaveWaitlist(waitlistId: string) {
    if (!(await confirm({ title: "¿Salir de la lista de espera?", confirmLabel: "Salir", tone: "danger" }))) return;
    setActionLoading(waitlistId);
    try {
      const { leaveWaitlist } = await import("@/features/bookings/services/bookingsService");
      await leaveWaitlist(waitlistId);
      notify("Saliste de la lista de espera.");
      await reload();
    } catch (err) {
      notify(getErrorMessage(err, "No se pudo salir de la lista de espera."), "error");
      console.error("[my-bookings] leave waitlist fallo", err);
    } finally {
      setActionLoading(null);
    }
  }

  return (
    <div id="my-bookings-page" className="mx-auto max-w-[760px] space-y-10 px-4 py-6 sm:px-8 sm:py-8">
      <div>
        <BackButton />
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div className="space-y-3">
            <p className="etiqueta">Estudio de Pilates</p>
            <h1 className="font-display text-titulo font-medium sm:text-display-l">Mi horario</h1>
          </div>
          <CreditsBadge balance={balance} loading={creditsLoading} />
        </header>
      </div>

      {error && <ErrorState message={error} />}

      {cancelledByBusiness.length > 0 && (
        <section id="my-bookings-cancelled-by-business" aria-label="Clases canceladas por la academia" className="space-y-2">
          {cancelledByBusiness.map((booking) => (
            <p
              key={booking.id}
              role="status"
              className="alerta-entra flex items-start gap-3 rounded-card bg-suave px-4 py-3 text-cuerpo text-texto"
            >
              <CalendarX className="mt-0.5 h-5 w-5 shrink-0 text-alerta" strokeWidth={1.8} aria-hidden="true" />
              <span className="text-pretty">
                La academia canceló <strong className="font-medium">{booking.class.title}</strong> del{" "}
                {formatDate(booking.class.startsAt)} a las{" "}
                {formatTime(booking.class.startsAt)}. Tu crédito ya regresó a tu saldo.
              </span>
            </p>
          ))}
        </section>
      )}

      <section aria-labelledby="my-bookings-title" className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <h2 id="my-bookings-title" className="font-display text-subtitulo font-medium">
            Mis reservaciones
          </h2>
          <Link to="/classes" className={buttonClasses("soft", "sm")}>
            Reservar más
          </Link>
        </div>

        {loading ? (
          <LoadingState message="Cargando…" />
        ) : bookings.length === 0 ? (
          <div className="entra">
            <EmptyState
              title="No tienes reservaciones"
              description="Explora las clases disponibles y reserva tu lugar."
              action={
                <Link to="/classes" className={buttonClasses("primary", "md")}>
                  Ver horarios
                </Link>
              }
            />
          </div>
        ) : (
          <div className="entra space-y-3" id="my-bookings-list">
            {bookings.map((booking) => (
              <BookingCard
                key={booking.id}
                booking={booking}
                onCancel={handleCancel}
                loading={actionLoading === booking.id}
              />
            ))}
          </div>
        )}
      </section>

      <section aria-labelledby="my-waitlist-title" className="space-y-4">
        <h2 id="my-waitlist-title" className="font-display text-subtitulo font-medium">
          Lista de espera
        </h2>

        {waitlist.length === 0 ? (
          <p className="entra rounded-card bg-suave px-5 py-4 text-cuerpo text-texto-suave">No estás en ninguna lista de espera.</p>
        ) : (
          <div className="entra space-y-3" id="my-waitlist-list">
            {waitlist.map((entry) => (
              <WaitlistCard
                key={entry.id}
                entry={entry}
                onLeave={handleLeaveWaitlist}
                loading={actionLoading === entry.id}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
