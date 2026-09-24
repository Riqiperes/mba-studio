// apps/web/src/features/bookings/components/WaitlistCard.tsx
import { formatDate, formatTime, formatTimeParts } from "@/utils/dateUtils";
import { Button } from "@/components/ui/Button";
import type { WaitlistEntryWithClass } from "../types/WaitlistEntry";

type Props = {
  entry: WaitlistEntryWithClass;
  onLeave: (waitlistId: string) => Promise<void>;
  loading?: boolean | undefined;
};

export function WaitlistCard({ entry, onLeave, loading }: Props) {
  const handleLeave = async () => {
    if (!window.confirm("¿Salir de la lista de espera?")) return;
    await onLeave(entry.id);
  };

  const { time, period } = formatTimeParts(entry.class.startsAt);

  return (
    <article
      id={`waitlist-card-${entry.id}`}
      className="grid grid-cols-[64px_1fr] items-center gap-x-4 gap-y-3 rounded-card border border-borde bg-tarjeta p-4 shadow-card sm:grid-cols-[72px_1fr_auto] sm:p-5"
    >
      <p className="flex flex-col items-center border-e border-borde pe-4 text-center leading-none">
        <span className="font-display text-[1.375rem] font-medium tabular-nums text-texto">{time}</span>
        <span className="mt-1 text-pequeno text-texto-suave">{period}</span>
      </p>
      <div className="min-w-0 space-y-1.5">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-suave px-2.5 py-0.5 text-pequeno font-medium text-alerta">
          <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-alerta" />
          Posición #{entry.position}
        </span>
        <h3 className="text-base font-medium text-texto">{entry.class.title}</h3>
        <p className="text-pequeno text-texto-suave first-letter:uppercase">
          {formatDate(entry.class.startsAt)} · {formatTime(entry.class.startsAt)} – {formatTime(entry.class.endsAt)}
        </p>
        {entry.class.instructorName && <p className="text-pequeno text-texto-suave">{entry.class.instructorName}</p>}
      </div>
      <div className="col-start-2 sm:col-start-3">
        <Button variant="outline" size="sm" onClick={handleLeave} disabled={loading} loading={loading}>
          Salir
        </Button>
      </div>
    </article>
  );
}
