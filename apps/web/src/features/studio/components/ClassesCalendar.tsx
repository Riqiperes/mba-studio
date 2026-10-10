import { useEffect, useState, type KeyboardEvent, type ReactNode } from "react";
import type { StudioClassWithInstructor } from "../types/StudioClass";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/Button";
import { buttonClasses } from "@/components/ui/buttonStyles";
import { EmptyState } from "@/components/ui/EmptyState";
import { ClassCapacityBar } from "@/components/ui/ClassCapacityBar";
import { formatTimeParts } from "@/utils/dateUtils";

export interface ClassBookingState {
  isBooked: boolean;
  isWaitlisted: boolean;
  waitlistId: string | null;
  waitlistPosition: number | null;
  hasCapacity: boolean;
  /** Reservas CONFIRMED de todos los clientes (solo el numero, RPC class_booking_counts). */
  bookedCount: number;
  bookingId: string | null;
}

type ClassWithBookingState = StudioClassWithInstructor & {
  bookingState: ClassBookingState;
};

type Props = {
  classes: ClassWithBookingState[];
  onBook: (classId: string) => Promise<void>;
  onCancel: (bookingId: string) => Promise<void>;
  onJoinWaitlist: (classId: string, businessId: string) => Promise<void>;
  onLeaveWaitlist: (waitlistId: string) => Promise<void>;
  hasCredits: boolean;
  loading?: boolean | undefined;
  /** Domingo de la semana mostrada (YYYY-MM-DD), para la fila de dias. */
  weekStart?: string | undefined;
};

/** Alto del encabezado colapsado (hora + nombre) de una carta en abanico. */
const COLLAPSED_CARD_HEIGHT = 58;
/** Distancia vertical entre el inicio de una carta y la siguiente: menor
    que COLLAPSED_CARD_HEIGHT a proposito, para que se encimen un poco. */
const CARD_PEEK_OFFSET = 38;

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
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [pinnedId, setPinnedId] = useState<string | null>(null);
  const activeId = pinnedId ?? hoveredId;

  // Clic fuera de cualquier carta (cada carta detiene la propagacion en su
  // propio onClick): cierra la carta fijada. Un solo listener para toda la
  // pagina, no por carta.
  useEffect(() => {
    function handleDocumentClick() {
      setPinnedId(null);
    }
    document.addEventListener("click", handleDocumentClick);
    return () => document.removeEventListener("click", handleDocumentClick);
  }, []);

  const classesByDate = new Map<string, ClassWithBookingState[]>();

  for (const cls of classes) {
    const dateKey = formatLocalDateKey(new Date(cls.startsAt));
    if (!classesByDate.has(dateKey)) {
      classesByDate.set(dateKey, []);
    }
    classesByDate.get(dateKey)!.push(cls);
  }

  const sortedDates = Array.from(classesByDate.keys()).sort();
  const actionHandlers: ActionHandlers = { onBook, onCancel, onJoinWaitlist, onLeaveWaitlist, hasCredits, loading };
  const weekDays = weekStart ? buildWeekDays(weekStart) : [];

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
        <>
          {/* Movil: lista apilada, un dia debajo del otro (sin cambios) */}
          <div id="classes-calendar-mobile" className="space-y-8 sm:hidden">
            {sortedDates.map((dateKey) => {
              const dayClasses = classesByDate.get(dateKey)!;
              const firstClass = dayClasses[0]!;
              return (
                <section key={dateKey} aria-labelledby={`classes-date-${dateKey}`} className="scroll-mt-28 space-y-3">
                  <h2 id={`classes-date-${dateKey}`} className="etiqueta">
                    {formatDate(firstClass.startsAt)}
                  </h2>
                  <ul className="grid gap-3">
                    {dayClasses.map((cls) => (
                      <li key={cls.id}>
                        <ClassRow cls={cls} action={renderAction(cls, actionHandlers)} />
                      </li>
                    ))}
                  </ul>
                </section>
              );
            })}
          </div>

          {/* Escritorio: 7 columnas (una por dia); clases en abanico si hay varias */}
          <div id="classes-calendar-desktop" className="hidden sm:grid sm:grid-cols-7 sm:gap-3 sm:pb-16">
            {weekDays.map((date) => {
              const key = formatLocalDateKey(date);
              const dayClasses = classesByDate.get(key) ?? [];
              return (
                <div key={key} className="flex flex-col gap-2">
                  <h2 className="flex flex-col items-center gap-0.5">
                    <span className="etiqueta">{date.toLocaleDateString("es-MX", { weekday: "short" }).replace(".", "")}</span>
                    <span className="font-display text-subtitulo font-medium tabular-nums text-texto">{date.getDate()}</span>
                  </h2>

                  {dayClasses.length === 0 ? (
                    <p className="rounded-card border border-dashed border-borde py-6 text-center text-pequeno text-texto-suave">
                      Sin clases
                    </p>
                  ) : dayClasses.length === 1 ? (
                    <FannedClassCard cls={dayClasses[0]!} action={renderAction(dayClasses[0]!, actionHandlers)} isOpen />
                  ) : (
                    <div className="relative" style={{ height: CARD_PEEK_OFFSET * (dayClasses.length - 1) + COLLAPSED_CARD_HEIGHT }}>
                      {dayClasses.map((cls, index) => (
                        <FannedClassCard
                          key={cls.id}
                          cls={cls}
                          action={renderAction(cls, actionHandlers)}
                          isOpen={activeId === cls.id}
                          stacked={{
                            index,
                            onEnter: () => setHoveredId(cls.id),
                            onLeave: () => setHoveredId((id) => (id === cls.id ? null : id)),
                            onToggle: () => setPinnedId((id) => (id === cls.id ? null : cls.id)),
                          }}
                        />
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

/** Fila de 7 dias (Dom a Sab): salta al dia; hoy va resaltado. Solo movil
    (el calendario de escritorio ya muestra los 7 dias como columnas). */
function WeekDaysRow({
  weekStart,
  daysWithClasses,
}: {
  weekStart: string;
  daysWithClasses: Map<string, ClassWithBookingState[]>;
}) {
  const days = buildWeekDays(weekStart);
  const todayKey = formatLocalDateKey(new Date());

  return (
    <nav id="classes-week-days" aria-label="Días de la semana" className="sm:hidden">
      <ol className="grid grid-cols-7 gap-1">
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
                  aria-current={isToday ? "date" : undefined}
                  className={`${baseClasses} ${isToday ? "" : "opacity-45"}`}
                >
                  <span aria-hidden="true" className="contents">{content}</span>
                  <span className="sr-only">{`${dayLabel}, sin clases`}</span>
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

/** 7 fechas de la semana (Dom a Sab) a partir del Domingo (weekStart). */
function buildWeekDays(weekStart: string): Date[] {
  const start = new Date(`${weekStart}T00:00:00`);
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    return date;
  });
}

/** Carta de clase en movil: siempre completa, en una lista vertical. */
function ClassRow({ cls, action }: { cls: ClassWithBookingState; action: ReactNode }) {
  const { time, period } = formatTimeParts(cls.startsAt);
  const durationMinutes = Math.round((new Date(cls.endsAt).getTime() - new Date(cls.startsAt).getTime()) / 60000);
  const meta = [cls.instructorName, `${durationMinutes} min`].filter(Boolean).join(" · ");

  return (
    <article
      id={`class-card-${cls.id}`}
      className="grid grid-cols-[64px_1fr] items-center gap-x-4 gap-y-3 rounded-card border border-borde bg-tarjeta p-4 shadow-card"
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
          {getStatusLabel(cls.status)}
        </p>
        <ClassCapacityBar booked={cls.bookingState.bookedCount} capacity={cls.maxCapacity} />
      </div>
      <div className="col-start-2 flex flex-wrap items-center gap-2">
        {action}
        <Link to={`/classes/${cls.id}`} className={buttonClasses("ghost", "sm")}>
          Ver detalle
        </Link>
      </div>
    </article>
  );
}

type StackedCardProps = {
  index: number;
  onEnter: () => void;
  onLeave: () => void;
  onToggle: () => void;
};

/**
 * Carta de clase en escritorio. Sin `stacked`, se ve completa y quieta (el
 * unico caso de un dia con una sola clase). Con `stacked`, vive en una pila
 * en abanico: colapsada solo se ve hora + nombre; `isOpen` (hover o clic
 * fijado) la trae al frente, la agranda un poco y muestra el resto.
 */
function FannedClassCard({
  cls,
  action,
  isOpen,
  stacked,
}: {
  cls: ClassWithBookingState;
  action: ReactNode;
  isOpen: boolean;
  stacked?: StackedCardProps | undefined;
}) {
  const { time, period } = formatTimeParts(cls.startsAt);
  const durationMinutes = Math.round((new Date(cls.endsAt).getTime() - new Date(cls.startsAt).getTime()) / 60000);
  const meta = [cls.instructorName, `${durationMinutes} min`].filter(Boolean).join(" · ");

  function handleHeaderKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (!stacked) return;
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      stacked.onToggle();
    }
  }

  return (
    <article
      id={`class-card-${cls.id}`}
      onMouseEnter={stacked?.onEnter}
      onMouseLeave={stacked?.onLeave}
      onClick={stacked ? (event) => event.stopPropagation() : undefined}
      style={stacked ? { top: stacked.index * CARD_PEEK_OFFSET, zIndex: isOpen ? 50 : stacked.index } : undefined}
      className={`origin-top rounded-card border border-borde bg-tarjeta shadow-card transition-[transform,box-shadow] duration-300 ease-(--ease-brand) ${
        stacked ? `absolute inset-x-0 ${isOpen ? "scale-[1.04] shadow-lg" : ""}` : ""
      }`}
    >
      <div
        role={stacked ? "button" : undefined}
        tabIndex={stacked ? 0 : undefined}
        aria-expanded={stacked ? isOpen : undefined}
        onClick={stacked ? () => stacked.onToggle() : undefined}
        onKeyDown={handleHeaderKeyDown}
        className={`px-3 py-2.5 ${stacked ? "cursor-pointer" : ""}`}
      >
        <p className="font-display text-[0.9375rem] font-medium tabular-nums text-texto leading-tight">
          {time}
          <span className="ms-1 text-[0.625rem] font-sans font-normal text-texto-suave">{period}</span>
        </p>
        <p className="truncate text-pequeno text-texto-suave">{cls.title}</p>
      </div>
      <div
        className={`grid transition-[grid-template-rows] duration-300 ease-(--ease-brand) ${
          isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
        }`}
      >
        <div className="overflow-hidden">
          <div className="flex flex-col gap-2 px-3 pb-3">
            <p className="text-pequeno text-texto-suave">{meta}</p>
            <p className="flex items-center gap-1.5 text-pequeno text-texto-suave">
              <span aria-hidden="true" className={`h-1.5 w-1.5 rounded-full ${cls.status === "SCHEDULED" ? "bg-exito" : "bg-alerta"}`} />
              {getStatusLabel(cls.status)}
            </p>
            <ClassCapacityBar booked={cls.bookingState.bookedCount} capacity={cls.maxCapacity} />
            <div className="flex flex-wrap items-center gap-2">
              {action}
              <Link to={`/classes/${cls.id}`} className={buttonClasses("ghost", "sm")}>
              Ver detalle
            </Link>
            </div>
          </div>
        </div>
      </div>
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
      <Button variant="secondary" size="sm" onClick={() => onJoinWaitlist(cls.id, cls.businessId)} disabled={loading}>
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
