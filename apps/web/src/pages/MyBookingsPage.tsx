// apps/web/src/pages/MyBookingsPage.tsx
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
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

export function MyBookingsPage() {
  const { bookings, waitlist, loading, error, reload } = useMyBookings();
  const { balance, loading: creditsLoading, reload: reloadCredits } = useMyCredits();

  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    reload();
    reloadCredits();
  }, [reload, reloadCredits]);

  async function handleCancel(bookingId: string) {
    setActionLoading(bookingId);
    try {
      const { cancelBooking } = await import("@/features/bookings/services/bookingsService");
      await cancelBooking(bookingId);
      await reload();
      await reloadCredits();
    } catch (err) {
      console.error("[my-bookings] cancel fallo", err);
    } finally {
      setActionLoading(null);
    }
  }

  async function handleLeaveWaitlist(waitlistId: string) {
    setActionLoading(waitlistId);
    try {
      const { leaveWaitlist } = await import("@/features/bookings/services/bookingsService");
      await leaveWaitlist(waitlistId);
      await reload();
    } catch (err) {
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
          <EmptyState
            title="No tienes reservaciones"
            description="Explora las clases disponibles y reserva tu lugar."
            action={
              <Link to="/classes" className={buttonClasses("primary", "md")}>
                Ver horarios
              </Link>
            }
          />
        ) : (
          <div className="space-y-3" id="my-bookings-list">
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
          <p className="rounded-card bg-suave px-5 py-4 text-cuerpo text-texto-suave">No estás en ninguna lista de espera.</p>
        ) : (
          <div className="space-y-3" id="my-waitlist-list">
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
