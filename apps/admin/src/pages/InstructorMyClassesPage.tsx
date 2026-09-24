import { useEffect, useMemo, useState } from "react";
import { BackButton } from "@/components/ui/BackButton";
import { useAuth } from "@/features/auth/hooks/AuthProvider";
import { useClasses } from "@/features/classes/hooks/useClasses";
import { listBookingsByClass } from "@/features/bookings/services/bookingsService";
import type { BookingWithCustomer } from "@/features/bookings/types/Booking";
import { useAcademyGroups } from "@/features/academy/hooks/useAcademyGroups";
import { listEnrollmentsByGroup } from "@/features/academy/services/academyEnrollmentsService";
import type { AcademyEnrollmentWithStudent } from "@/features/academy/types/AcademyEnrollment";

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("es-MX", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function InstructorMyClassesPage() {
  const { profile } = useAuth();
  const instructorId = profile?.instructorId ?? undefined;

  const { classes, loading: classesLoading } = useClasses(
    useMemo(() => (instructorId ? { instructorId } : {}), [instructorId]),
  );
  const { groups, loading: groupsLoading } = useAcademyGroups();
  const myGroups = useMemo(
    () => groups.filter((g) => g.instructorId === instructorId),
    [groups, instructorId],
  );

  const [bookingsByClass, setBookingsByClass] = useState<Record<string, BookingWithCustomer[]>>({});
  const [enrollmentsByGroup, setEnrollmentsByGroup] = useState<
    Record<string, AcademyEnrollmentWithStudent[]>
  >({});

  useEffect(() => {
    if (classes.length === 0) return;
    Promise.all(classes.map((c) => listBookingsByClass(c.id).then((rows) => [c.id, rows] as const)))
      .then((entries) => setBookingsByClass(Object.fromEntries(entries)))
      .catch((err) => console.error("[instructor] listBookingsByClass fallo", err));
  }, [classes]);

  useEffect(() => {
    if (myGroups.length === 0) return;
    Promise.all(
      myGroups.map((g) => listEnrollmentsByGroup(g.id).then((rows) => [g.id, rows] as const)),
    )
      .then((entries) => setEnrollmentsByGroup(Object.fromEntries(entries)))
      .catch((err) => console.error("[instructor] listEnrollmentsByGroup fallo", err));
  }, [myGroups]);

  if (!profile?.instructorId) {
    return (
      <div className="mx-auto max-w-3xl p-4 text-cuerpo sm:p-6">
        <BackButton />
        <p className="vacio">
          Tu cuenta todavía no está vinculada a un instructor. Pide al administrador que la vincule
          en "Usuarios".
        </p>
      </div>
    );
  }

  return (
    <div id="instructor-my-classes-page" className="mx-auto max-w-3xl p-4 sm:p-6">
      <BackButton />
      <p className="etiqueta mb-2">Instructor</p>
      <h1 className="mb-4 font-display text-titulo font-medium text-texto">Mis clases</h1>

      <section className="mb-8 space-y-3">
        <h2 className="font-display text-subtitulo font-medium text-texto">Studio</h2>
        {classesLoading && <p role="status" className="text-pequeno text-texto-suave">Cargando…</p>}
        {!classesLoading && classes.length === 0 && (
          <p className="vacio">No tienes clases asignadas.</p>
        )}
        {classes.map((studioClass) => (
          <div key={studioClass.id} className="rounded-card border border-borde bg-tarjeta p-4 shadow-card">
            <p className="font-medium text-texto">{studioClass.title}</p>
            <p className="mb-2 text-pequeno text-texto-suave">{formatDateTime(studioClass.startsAt)}</p>
            <ul className="text-sm text-texto">
              {(bookingsByClass[studioClass.id] ?? []).map((booking) => (
                <li key={booking.id}>{booking.customerName ?? "-"}</li>
              ))}
              {(bookingsByClass[studioClass.id] ?? []).length === 0 && (
                <li className="text-texto-suave">Sin reservados</li>
              )}
            </ul>
          </div>
        ))}
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-subtitulo font-medium text-texto">Academia</h2>
        {groupsLoading && <p role="status" className="text-pequeno text-texto-suave">Cargando…</p>}
        {!groupsLoading && myGroups.length === 0 && (
          <p className="vacio">No tienes grupos de academia asignados.</p>
        )}
        {myGroups.map((group) => (
          <div key={group.id} className="rounded-card border border-borde bg-tarjeta p-4 shadow-card">
            <p className="font-medium text-texto">{group.name}</p>
            <ul className="text-sm text-texto">
              {(enrollmentsByGroup[group.id] ?? []).map((enrollment) => (
                <li key={enrollment.id}>{enrollment.studentName}</li>
              ))}
              {(enrollmentsByGroup[group.id] ?? []).length === 0 && (
                <li className="text-texto-suave">Sin alumnos inscritos</li>
              )}
            </ul>
          </div>
        ))}
      </section>
    </div>
  );
}
