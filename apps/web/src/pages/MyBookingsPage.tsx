// apps/web/src/pages/MyBookingsPage.tsx
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useMyBookings } from "@/features/bookings/hooks/useMyBookings";
import { useMyCredits } from "@/features/credits/hooks/useMyCredits";
import { BookingCard } from "@/features/bookings/components/BookingCard";
import { WaitlistCard } from "@/features/bookings/components/WaitlistCard";
import { CreditsBadge } from "@/features/credits/components/CreditsBadge";
import { Card, CardContent } from "@/components/ui/Card";

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
    <div id="my-bookings-page" className="mx-auto max-w-xl px-4 py-6 space-y-8 pb-24">
      <header className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-brand-primary">Mi horario</h1>
        <CreditsBadge balance={balance} loading={creditsLoading} />
      </header>

      {error && (
        <div className="rounded-md bg-red-50 p-4 text-sm text-red-600">{error}</div>
      )}

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Mis reservaciones</h2>
          <Link to="/classes" className="text-sm text-brand-primary hover:underline">
            Reservar más
          </Link>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12 text-gray-500">Cargando...</div>
        ) : bookings.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center text-center py-8">
              <span className="mb-3 text-4xl">📅</span>
              <h3 className="text-lg font-medium text-gray-900">No tienes reservaciones</h3>
              <p className="mt-1 text-sm text-gray-500">Explora las clases disponibles y reserva tu lugar.</p>
              <Link to="/classes" className="mt-4">
                <span className="text-brand-primary hover:underline">Ver horarios</span>
              </Link>
            </CardContent>
          </Card>
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

      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-gray-900">Lista de espera</h2>

        {waitlist.length === 0 ? (
          <p className="text-sm text-gray-500">No estás en ninguna lista de espera.</p>
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