// apps/web/src/features/bookings/components/WaitlistCard.tsx
import { formatDate, formatTime } from "@/utils/dateUtils";
import type { WaitlistEntryWithClass } from "../types/WaitlistEntry";

type Props = {
  entry: WaitlistEntryWithClass;
  onLeave: (waitlistId: string) => Promise<void>;
  loading?: boolean;
};

export function WaitlistCard({ entry, onLeave, loading }: Props) {
  const handleLeave = async () => {
    if (!window.confirm("¿Salir de la lista de espera?")) return;
    await onLeave(entry.id);
  };

  return (
    <article id={`waitlist-card-${entry.id}`} className="flex flex-col rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-800">
              Posición #{entry.position}
            </span>
            <h3 className="font-medium text-brand-primary">{entry.class.title}</h3>
          </div>
          <div className="mt-2 flex flex-col gap-1 text-sm text-gray-600">
            <p className="flex items-center gap-1">
              <span className="font-medium">{formatDate(entry.class.startsAt)}</span>
              <span className="text-gray-400">·</span>
              <span>{formatTime(entry.class.startsAt)} – {formatTime(entry.class.endsAt)}</span>
            </p>
            {entry.class.instructorName && (
              <p className="flex items-center gap-1">
                <span className="font-medium">{entry.class.instructorName}</span>
              </p>
            )}
          </div>
        </div>
        <button
          type="button"
          onClick={handleLeave}
          disabled={loading}
          className="flex-shrink-0 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
        >
          Salir
        </button>
      </div>
    </article>
  );
}