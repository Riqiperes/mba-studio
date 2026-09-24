// apps/web/src/features/bookings/components/BookingCard.tsx
import { formatDate, formatTime, formatTimeParts } from "@/utils/dateUtils";
import { Button } from "@/components/ui/Button";
import type { BookingWithClass } from "../types/Booking";

type Props = {
  booking: BookingWithClass;
  onCancel: (bookingId: string) => Promise<void>;
  loading?: boolean | undefined;
};

export function BookingCard({ booking, onCancel, loading }: Props) {
  const handleCancel = async () => {
    if (!window.confirm("¿Cancelar esta reservación? Se te devolverá el crédito.")) return;
    await onCancel(booking.id);
  };

  const { time, period } = formatTimeParts(booking.class.startsAt);

  return (
    <article
      id={`booking-card-${booking.id}`}
      className="grid grid-cols-[64px_1fr] items-center gap-x-4 gap-y-3 rounded-card border border-borde bg-tarjeta p-4 shadow-card sm:grid-cols-[72px_1fr_auto] sm:p-5"
    >
      <p className="flex flex-col items-center border-e border-borde pe-4 text-center leading-none">
        <span className="font-display text-[1.375rem] font-medium tabular-nums text-texto">{time}</span>
        <span className="mt-1 text-pequeno text-texto-suave">{period}</span>
      </p>
      <div className="min-w-0 space-y-1">
        <h3 className="text-base font-medium text-texto">{booking.class.title}</h3>
        <p className="text-pequeno text-texto-suave first-letter:uppercase">
          {formatDate(booking.class.startsAt)} · {formatTime(booking.class.startsAt)} – {formatTime(booking.class.endsAt)}
        </p>
        {booking.class.instructorName && <p className="text-pequeno text-texto-suave">{booking.class.instructorName}</p>}
      </div>
      <div className="col-start-2 sm:col-start-3">
        <Button variant="danger" size="sm" onClick={handleCancel} disabled={loading} loading={loading}>
          Cancelar
        </Button>
      </div>
    </article>
  );
}
