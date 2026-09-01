import { Link } from "react-router-dom";
import type { StudioClassWithInstructor } from "../types/StudioClass";

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

export function ClassesCalendar({ classes }: { classes: StudioClassWithInstructor[] }) {
  const classesByDate = new Map<string, StudioClassWithInstructor[]>();

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
              {dayClasses.map((cls) => (
                <Link key={cls.id} to={`/classes/${cls.id}`}>
                  <article
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
                    <div className="mt-auto pt-3 flex items-center justify-between border-t border-gray-100">
                      <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">
                        {getStatusLabel(cls.status)}
                      </span>
                    </div>
                  </article>
                </Link>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}