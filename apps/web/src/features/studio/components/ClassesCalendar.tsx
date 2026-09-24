import type { ReactNode } from "react";
import type { StudioClassWithInstructor } from "../types/StudioClass";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";

export interface ClassBookingState {
  isBooked: boolean;
  isWaitlisted: boolean;
  waitlistId: string | null;
  waitlistPosition: number | null;
  hasCapacity: boolean;
  bookingId: string | null;
}

type ClassWithBookingState = StudioClassWithInstructor & {
  bookingState: ClassBookingState;
};

type Props = {
  classes: ClassWithBookingState[];
  onBook: (classId: string) => Promise<void>;
  onCancel: (bookingId: string) => Promise<void>;
  onJoinWaitlist: (classId: string) => Promise<void>;
  onLeaveWaitlist: (waitlistId: string) => Promise<void>;
  hasCredits: boolean;
  loading?: boolean | undefined;
  /** Domingo de la semana mostrada (YYYY-MM-DD), para la fila de dias. */
  weekStart?: string | undefined;
};

export function ClassesCalendar({
  classes,
  onBook,
  onCancel,
  onJoinWaitlist,
  onLeaveWaitlist,
  hasCredits,
  loading,
  weekStart,
}: Props) {
  const classesByDate = new Map<string, ClassWithBookingState[]>();

  for (const cls of classes) {
    const dateKey = formatLocalDateKey(new Date(cls.startsAt));
    if (!classesByDate.has(dateKey)) {
      classesByDate.set(dateKey, []);
    }
    classesByDate.get(dateKey)!.push(cls);
  }

  const sortedDates = Array.from(classesByDate.keys()).sort();

  return (
    <div className="space-y-8">
      {weekStart && <WeekDaysRow weekStart={weekStart} daysWithClasses={classesByDate} />}

      {sortedDates.length === 0 ? (
        <EmptyState
          id="classes-calendar-empty"
          title="Aún no hay clases esta semana"
          description="Prueba la semana siguiente o escríbenos por WhatsApp."
        />
      ) : (
        <div id="classes-calendar" className="space-y-8">
          {sortedDates.map((dateKey) => {
            const dayClasses = classesByDate.get(dateKey)!;
            const firstClass = dayClasses[0]!;
            return (
              <section key={dateKey} aria-labelledby={`classes-date-${dateKey}`} className="scroll-mt-28 space-y-3">
                <h2 id={`classes-date-${dateKey}`} className="etiqueta">
                  {formatDate(firstClass.startsAt)}
                </h2>
                <ul className="grid gap-3 lg:grid-cols-2">
                  {dayClasses.map((cls) => (
                    <li key={cls.id}>
                      <ClassRow
                        cls={cls}
                        action={renderAction(cls, { onBook, onCancel, onJoinWaitlist, onLeaveWaitlist, hasCredits, loading })}
                      />
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}

/** Fila de 7 dias (Dom a Sab): salta al dia; hoy va resaltado. */
function WeekDaysRow({
  weekStart,
  daysWithClasses,
}: {
  weekStart: string;
  daysWithClasses: Map<string, ClassWithBookingState[]>;
}) {
  const start = new Date(`${weekStart}T00:00:00`);
  const todayKey = formatLocalDateKey(new Date());
  const days = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    return date;
  });

  return (
    <nav id="classes-week-days" aria-label="Días de la semana">
      <ol className="grid grid-cols-7 gap-1 sm:gap-2">
        {days.map((date) => {
          const key = formatLocalDateKey(date);
          const hasClasses = daysWithClasses.has(key);
          const isToday = key === todayKey;
          const weekday = date.toLocaleDateString("es-MX", { weekday: "short" }).replace(".", "");
          const dayLabel = date.toLocaleDateString("es-MX", { weekday: "long", day: "numeric", month: "long" });
          const content = (
            <>
              <span className="text-[0.6875rem] font-medium tracking-[0.12em] uppercase">{weekday}</span>
              <span className="font-display text-subtitulo tabular-nums">{date.getDate()}</span>
              <span
                aria-hidden="true"
                className={`h-1 w-1 rounded-full ${hasClasses ? (isToday ? "bg-sobre-acento" : "bg-acento") : "bg-transparent"}`}
              />
            </>
          );
          const baseClasses = `flex flex-col items-center gap-0.5 rounded-control py-2 transition-colors duration-200 ${
            isToday ? "bg-acento text-sobre-acento" : "text-texto"
          }`;

          return (
            <li key={key}>
              {hasClasses ? (
                <a
                  href={`#classes-date-${key}`}
                  aria-label={`${dayLabel}, ver clases`}
                  aria-current={isToday ? "date" : undefined}
                  className={`${baseClasses} ${isToday ? "" : "hover:bg-acento-suave active:bg-acento-suave"}`}
                >
                  {content}
                </a>
              ) : (
                <span
                  aria-label={`${dayLabel}, sin clases`}
                  aria-current={isToday ? "date" : undefined}
                  className={`${baseClasses} ${isToday ? "" : "opacity-45"}`}
                >
                  {content}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

function ClassRow({ cls, action }: { cls: ClassWithBookingState; action: ReactNode }) {
  const { time, period } = splitTime(cls.startsAt);
  const durationMinutes = Math.round((new Date(cls.endsAt).getTime() - new Date(cls.startsAt).getTime()) / 60000);
  const meta = [cls.instructorName, `${durationMinutes} min`].filter(Boolean).join(" · ");

  return (
    <article
      id={`class-card-${cls.id}`}
      className="grid grid-cols-[64px_1fr] items-center gap-x-4 gap-y-3 rounded-card border border-borde bg-tarjeta p-4 shadow-card sm:grid-cols-[72px_1fr_auto] sm:p-5"
    >
      <p className="flex flex-col items-center border-e border-borde pe-4 text-center leading-none">
        <span className="font-display text-[1.375rem] font-medium tabular-nums text-texto">{time}</span>
        <span className="mt-1 text-pequeno text-texto-suave">{period}</span>
      </p>
      <div className="min-w-0 space-y-1">
        <h3 className="text-base font-medium text-texto">{cls.title}</h3>
        <p className="text-pequeno text-texto-suave">{meta}</p>
        <p className="flex items-center gap-1.5 text-pequeno text-texto-suave">
          <span aria-hidden="true" className={`h-1.5 w-1.5 rounded-full ${cls.status === "SCHEDULED" ? "bg-exito" : "bg-alerta"}`} />
          {getStatusLabel(cls.status)} · Cupo de {cls.maxCapacity}
        </p>
      </div>
      <div className="col-start-2 flex flex-wrap items-center gap-2 sm:col-start-3 sm:flex-col sm:items-end">{action}</div>
    </article>
  );
}

type ActionHandlers = Pick<Props, "onBook" | "onCancel" | "onJoinWaitlist" | "onLeaveWaitlist" | "hasCredits" | "loading">;

function renderAction(
  cls: ClassWithBookingState,
  { onBook, onCancel, onJoinWaitlist, onLeaveWaitlist, hasCredits, loading }: ActionHandlers,
): ReactNode {
  const { bookingState } = cls;

  if (bookingState.isBooked) {
    return (
      <>
        <StatusChip tone="exito">Reservado</StatusChip>
        <Button variant="danger" size="sm" onClick={() => onCancel(bookingState.bookingId!)} disabled={loading}>
          Cancelar
        </Button>
      </>
    );
  }

  if (bookingState.isWaitlisted && bookingState.waitlistId) {
    const waitlistId = bookingState.waitlistId;
    return (
      <>
        <StatusChip tone="alerta">En lista de espera #{bookingState.waitlistPosition}</StatusChip>
        <Button variant="ghost" size="sm" onClick={() => onLeaveWaitlist(waitlistId)} disabled={loading}>
          Salir
        </Button>
      </>
    );
  }

  if (!bookingState.hasCapacity) {
    return (
      <Button variant="secondary" size="sm" onClick={() => onJoinWaitlist(cls.id)} disabled={loading}>
        Unirse a lista de espera
      </Button>
    );
  }

  if (hasCredits) {
    return (
      <Button variant="primary" size="sm" onClick={() => onBook(cls.id)} disabled={loading}>
        Reservar
      </Button>
    );
  }

  return (
    <>
      <Button variant="outline" size="sm" disabled>
        Sin créditos
      </Button>
      <span className="text-pequeno text-texto-suave">Necesitas créditos para reservar</span>
    </>
  );
}

function StatusChip({ tone, children }: { tone: "exito" | "alerta"; children: ReactNode }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full bg-suave px-2.5 py-1 text-pequeno font-medium ${
        tone === "exito" ? "text-exito" : "text-alerta"
      }`}
    >
      <span aria-hidden="true" className={`h-1.5 w-1.5 rounded-full ${tone === "exito" ? "bg-exito" : "bg-alerta"}`} />
      {children}
    </span>
  );
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("es-MX", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

/** "7:00" y "a. m." por separado para la columna de hora. */
function splitTime(dateStr: string): { time: string; period: string } {
  const formatted = new Date(dateStr).toLocaleTimeString("es-MX", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
  const [time = formatted, ...rest] = formatted.split(/\s/);
  return { time, period: rest.join(" ") };
}

/** Clave YYYY-MM-DD en hora local (no UTC), para agrupar por dia real. */
function formatLocalDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getStatusLabel(status: StudioClassWithInstructor["status"]): string {
  if (status === "SCHEDULED") return "Programada";
  if (status === "CANCELLED") return "Cancelada";
  return "Terminada";
}
