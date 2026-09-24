import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { CalendarDays, Clock, MessageCircle, Smartphone, User, Users } from "lucide-react";
import { listUpcomingClasses } from "@/features/studio/services/studioClassesService";
import type { StudioClassWithInstructor } from "@/features/studio/types/StudioClass";
import { Button } from "@/components/ui/Button";
import { BackButton } from "@/components/ui/BackButton";
import { LoadingState } from "@/components/ui/LoadingState";
import { EmptyState } from "@/components/ui/EmptyState";
import { buttonClasses } from "@/components/ui/buttonStyles";

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

// Numero de WhatsApp para informes y clases (lada de Mexico 52).
const WHATSAPP_CONTACT_NUMBER = "529991072423";

function formatWhatsAppLink(message: string): string {
  return `https://wa.me/${WHATSAPP_CONTACT_NUMBER}?text=${encodeURIComponent(message)}`;
}

export function ClassDetailPage() {
  const { id } = useParams<{ id: string }>();
  const classId = id ?? "";
  const [cls, setCls] = useState<StudioClassWithInstructor | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadClass() {
      try {
        const classes = await listUpcomingClasses({});
        const found = classes.find((c) => c.id === classId);
        if (found) {
          setCls(found);
        } else {
          setError("Clase no encontrada");
        }
      } catch (err) {
        setError("No se pudo cargar la clase");
        console.error("[studio] ClassDetail fallo", err);
      } finally {
        setLoading(false);
      }
    }
    loadClass();
  }, [classId]);

  const handleWhatsApp = () => {
    if (!cls) return;
    const message = `Hola, me interesa la clase "${cls.title}" el ${formatDate(cls.startsAt)} a las ${formatTime(cls.startsAt)}. Quiero reservar mi lugar.`;
    window.open(formatWhatsAppLink(message), "_blank");
  };

  if (loading) {
    return <LoadingState id="class-detail-loading" message="Cargando clase…" />;
  }

  if (error || !cls) {
    return (
      <div id="class-detail-not-found" className="mx-auto max-w-md px-4 py-6 sm:py-8">
        <BackButton to="/classes" label="Horarios" />
        <EmptyState
          title="No encontramos esta clase"
          description={error ?? "La clase no existe o ya no está disponible."}
          action={
            <Link to="/classes" className={buttonClasses("secondary", "md")}>
              Ver horario de clases
            </Link>
          }
        />
      </div>
    );
  }

  const isScheduled = cls.status === "SCHEDULED";
  const statusLabel = isScheduled ? "Programada" : cls.status === "CANCELLED" ? "Cancelada" : "Terminada";

  const details = [
    { label: "Fecha", value: formatDate(cls.startsAt), Icon: CalendarDays },
    { label: "Horario", value: `${formatTime(cls.startsAt)} – ${formatTime(cls.endsAt)}`, Icon: Clock },
    ...(cls.instructorName ? [{ label: "Instructor", value: cls.instructorName, Icon: User }] : []),
    { label: "Cupo máximo", value: `${cls.maxCapacity} personas`, Icon: Users },
  ];

  return (
    <div id="class-detail-page" className="mx-auto max-w-[980px] px-4 py-6 sm:px-8 sm:py-8">
      <BackButton to="/classes" label="Horarios" />

      <div className="grid gap-6 lg:grid-cols-[1fr_380px] lg:items-start">
        <section id="class-detail-info" className="space-y-6">
          <header className="space-y-3">
            <p className="etiqueta">Estudio de Pilates</p>
            <h1 className="font-display text-titulo font-medium sm:text-display-l">{cls.title}</h1>
            <p className="inline-flex items-center gap-1.5 rounded-full bg-suave px-3 py-1 text-pequeno font-medium text-texto">
              <span aria-hidden="true" className={`h-1.5 w-1.5 rounded-full ${isScheduled ? "bg-exito" : "bg-alerta"}`} />
              {statusLabel}
            </p>
          </header>

          <dl className="divide-y divide-borde rounded-card border border-borde bg-tarjeta shadow-card sm:grid sm:grid-cols-2 sm:gap-3 sm:divide-y-0 sm:border-0 sm:bg-transparent sm:shadow-none">
            {details.map(({ label, value, Icon }) => (
              <div key={label} className="flex items-center gap-3 p-4 sm:rounded-card sm:border sm:border-borde sm:bg-tarjeta sm:shadow-card">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-acento-suave text-acento">
                  <Icon className="h-5 w-5" strokeWidth={1.6} aria-hidden="true" />
                </span>
                <div className="min-w-0">
                  <dt className="text-pequeno text-texto-suave">{label}</dt>
                  <dd className="font-medium text-texto first-letter:uppercase">{value}</dd>
                </div>
              </div>
            ))}
          </dl>
        </section>

        <aside
          id="class-detail-booking"
          aria-label="Reservar"
          className="rounded-card border border-borde bg-tarjeta p-6 shadow-card lg:sticky lg:top-[100px]"
        >
          <p className="etiqueta">Reserva tu lugar</p>
          <p className="mt-2 font-display text-precio font-medium tabular-nums">{formatTime(cls.startsAt)}</p>
          <p className="text-pequeno text-texto-suave first-letter:uppercase">{formatDate(cls.startsAt)}</p>

          <div className="mt-6 space-y-3 border-t border-borde pt-6">
            <Button variant="primary" size="lg" className="w-full" onClick={handleWhatsApp}>
              <MessageCircle className="h-5 w-5" strokeWidth={1.6} aria-hidden="true" />
              Reservar por WhatsApp
            </Button>
            <Button variant="outline" size="lg" className="w-full" disabled>
              <Smartphone className="h-5 w-5" strokeWidth={1.6} aria-hidden="true" />
              Reservar en app (próximamente)
            </Button>
            <p className="text-center text-pequeno text-texto-suave text-pretty">
              La reservación consumirá 1 crédito de tu paquete.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
