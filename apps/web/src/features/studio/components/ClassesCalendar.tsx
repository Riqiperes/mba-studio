import type { StudioClassWithInstructor } from "../types/StudioClass";

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
  loading?: boolean;
};

export function ClassesCalendar({
  classes,
  onBook,
  onCancel,
  onJoinWaitlist,
  onLeaveWaitlist,
  hasCredits,
  loading,
}: Props) {
  const classesByDate = new Map<string, ClassWithBookingState[]>();

  for (const cls of classes) {
    const dateKey = formatDateKey(cls.startsAt);
    if (!classesByDate.has(dateKey)) {
      classesByDate.set(dateKey, []);
    }
    classesByDate.get(dateKey)!.push(cls);
  }

  const sortedDates = Array.from(classesByDate.keys()).sort();

  if (sortedDates.length === 0) {
    return (
      <div id="classes-calendar-empty" className="text-center py-12 text-gray-500">
        <p>No hay clases programadas próximamente.</p>
      </div>
    );
  }

  return (
    <div id="classes-calendar" className="space-y-8">
      {sortedDates.map((dateKey) => {
        const dayClasses = classesByDate.get(dateKey)!;
        const firstClass = dayClasses[0]!;
        return (
          <section key={dateKey} className="space-y-4">
            <h2 id={`classes-date-${dateKey}`} className="text-lg font-semibold text-brand-primary">
              {formatDate(firstClass.startsAt)}
            </h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {dayClasses.map((cls) => {
                const { bookingState } = cls;
                const isBooked = bookingState.isBooked;
                const isWaitlisted = bookingState.isWaitlisted;
                const hasCapacity = bookingState.hasCapacity;
                const waitlistId = bookingState.waitlistId;
                const waitlistPosition = bookingState.waitlistPosition;

                let actionContent: React.ReactNode;

                if (isBooked) {
                  actionContent = (
                    <div className="flex flex-col gap-2">
                      <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">
                        Reservado
                      </span>
                      <button
                        type="button"
                        onClick={() => onCancel(bookingState.bookingId!)}
                        disabled={loading}
                        className="w-full rounded-md border border-red-300 bg-red-50 px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-100 disabled:opacity-50"
                      >
                        Cancelar
                      </button>
                    </div>
                  );
                } else if (isWaitlisted && waitlistId) {
                  actionContent = (
                    <div className="flex flex-col gap-2">
                      <span className="inline-flex items-center rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-800">
                        En lista de espera #{waitlistPosition}
                      </span>
                      <button
                        type="button"
                        onClick={() => onLeaveWaitlist(waitlistId)}
                        disabled={loading}
                        className="w-full rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                      >
                        Salir
                      </button>
                    </div>
                  );
                } else if (!hasCapacity) {
                  actionContent = (
                    <button
                      type="button"
                      onClick={() => onJoinWaitlist(cls.id)}
                      disabled={loading}
                      className="w-full rounded-md border border-amber-300 bg-amber-50 px-3 py-1.5 text-sm font-medium text-amber-800 hover:bg-amber-100 disabled:opacity-50"
                    >
                      Unirse a lista de espera
                    </button>
                  );
                } else if (hasCredits) {
                  actionContent = (
                    <button
                      type="button"
                      onClick={() => onBook(cls.id)}
                      disabled={loading}
                      className="w-full rounded-md bg-brand-primary px-3 py-1.5 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
                    >
                      Reservar
                    </button>
                  );
                } else {
                  actionContent = (
                    <button
                      type="button"
                      disabled
                      className="w-full rounded-md border border-gray-300 bg-gray-100 px-3 py-1.5 text-sm font-medium text-gray-500 cursor-not-allowed"
                      title="Necesitas créditos para reservar"
                    >
                      Sin créditos
                    </button>
                  );
                }

                return (
                  <article
                    key={cls.id}
                    id={`class-card-${cls.id}`}
                    className="flex flex-col rounded-lg border border-gray-200 bg-white p-5 shadow-sm hover:shadow-md transition-shadow"
                  >
                    <h3 className="font-medium text-brand-primary">{cls.title}</h3>
                    <div className="mt-2 flex flex-col gap-1 text-sm text-gray-600">
                      <p className="flex items-center gap-1">
                        <span className="font-medium">{formatTime(cls.startsAt)}</span>
                        <span className="text-gray-400">–</span>
                        <span>{formatTime(cls.endsAt)}</span>
                      </p>
                      {cls.instructorName && (
                        <p className="flex items-center gap-1">
                          <span className="font-medium">{cls.instructorName}</span>
                        </p>
                      )}
                      <p className="flex items-center gap-1 text-gray-500">
                        Cupo: {cls.maxCapacity}
                      </p>
                    </div>
                    <div className="mt-auto pt-3 flex flex-col gap-2 border-t border-gray-100">
                      <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">
                        {getStatusLabel(cls.status)}
                      </span>
                      {actionContent}
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("es-MX", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString("es-MX", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

function formatDateKey(dateStr: string): string {
  return new Date(dateStr).toISOString().slice(0, 10);
}

function getStatusLabel(status: StudioClassWithInstructor["status"]): string {
  return status === "SCHEDULED" ? "Programada" : status;
}