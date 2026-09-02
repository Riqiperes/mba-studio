// apps/web/src/features/bookings/components/BookingCard.tsx
import { formatDate, formatTime } from "@/utils/dateUtils";
import type { BookingWithClass } from "../types/Booking";

type Props = {
  booking: BookingWithClass;
  onCancel: (bookingId: string) => Promise<void>;
  loading?: boolean;
};

export function BookingCard({ booking, onCancel, loading }: Props) {
  const handleCancel = async () => {
    if (!window.confirm("¿Cancelar esta reservación? Se te devolverá el crédito.")) return;
    await onCancel(booking.id);
  };

  return (
    <article id={`booking-card-${booking.id}`} className="flex flex-col rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <h3 className="font-medium text-brand-primary">{booking.class.title}</h3>
          <div className="mt-2 flex flex-col gap-1 text-sm text-gray-600">
            <p className="flex items-center gap-1">
              <span className="font-medium">{formatDate(booking.class.startsAt)}</span>
              <span className="text-gray-400">·</span>
              <span>{formatTime(booking.class.startsAt)} – {formatTime(booking.class.endsAt)}</span>
            </p>
            {booking.class.instructorName && (
              <p className="flex items-center gap-1">
                <span className="font-medium">{booking.class.instructorName}</span>
              </p>
            )}
          </div>
        </div>
        <button
          type="button"
          onClick={handleCancel}
          disabled={loading}
          className="flex-shrink-0 rounded-md border border-red-300 bg-red-50 px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-100 disabled:opacity-50"
        >
          Cancelar
        </button>
      </div>
    </article>
  );
}