type Props = {
  booked: number;
  capacity: number;
  /** Texto encima de la barra; por defecto "6/10 inscritos". */
  label?: string | undefined;
};

/** Barra de cupo de una clase: inscritos contra cupo maximo. */
export function ClassCapacityBar({ booked, capacity, label }: Props) {
  const percent = capacity > 0 ? Math.min(100, Math.round((booked / capacity) * 100)) : 0;
  const isFull = capacity > 0 && booked >= capacity;
  const text = label ?? `${booked}/${capacity} inscritos`;

  return (
    <div className="w-full space-y-1">
      <p className="flex items-center justify-between gap-2 text-pequeno text-texto-suave">
        <span className="tabular-nums">{text}</span>
        {isFull && <span className="font-medium text-alerta">Llena</span>}
      </p>
      <div
        role="meter"
        aria-label="Cupo de la clase"
        aria-valuemin={0}
        aria-valuemax={capacity}
        aria-valuenow={Math.min(booked, capacity)}
        aria-valuetext={text}
        className="h-1.5 w-full overflow-hidden rounded-full bg-suave"
      >
        <div
          className={`h-full rounded-full transition-[width] duration-300 ${isFull ? "bg-alerta" : "bg-acento"}`}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}
