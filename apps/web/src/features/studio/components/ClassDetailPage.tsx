import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { listUpcomingClasses } from "@/features/studio/services/studioClassesService";
import type { StudioClassWithInstructor } from "@/features/studio/types/StudioClass";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { BackButton } from "@/components/ui/BackButton";

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

function formatWhatsAppLink(message: string): string {
  return `https://wa.me/?text=${encodeURIComponent(message)}`;
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
    const message = encodeURIComponent(
      `Hola, me interesa la clase "${cls.title}" el ${formatDate(cls.startsAt)} a las ${formatTime(cls.startsAt)}. Quiero reservar mi lugar.`
    );
    window.open(formatWhatsAppLink(message), "_blank");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] px-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-primary mx-auto mb-4"></div>
          <p className="text-gray-500">Cargando...</p>
        </div>
      </div>
    );
  }

  if (error || !cls) {
    return (
      <div className="mx-auto max-w-md px-4 py-12 text-center">
        <BackButton />
        <h2 className="mb-2 text-xl font-semibold text-gray-900">No encontrada</h2>
        <p className="text-gray-500">{error ?? "La clase no existe"}</p>
      </div>
    );
  }

  const statusColor = cls.status === "SCHEDULED"
    ? "bg-green-100 text-green-800"
    : cls.status === "CANCELLED"
    ? "bg-red-100 text-red-800"
    : "bg-gray-100 text-gray-800";

  return (
    <div id="class-detail-page" className="mx-auto max-w-md px-4 py-6 space-y-6 pb-24">
      <BackButton />

      <Card>
        <CardContent className="space-y-6 p-6">
          <div className="text-center space-y-3">
            <h1 className="text-2xl font-bold text-brand-primary">{cls.title}</h1>
            <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${statusColor}`}>
              {cls.status === "SCHEDULED" ? "Programada" : cls.status}
            </span>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 rounded-lg bg-gray-50">
              <div className="flex items-center gap-3">
                <span className="text-2xl">📅</span>
                <div>
                  <p className="text-sm text-gray-500">Fecha</p>
                  <p className="font-medium text-gray-900">{formatDate(cls.startsAt)}</p>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between p-4 rounded-lg bg-gray-50">
              <div className="flex items-center gap-3">
                <span className="text-2xl">🕐</span>
                <div>
                  <p className="text-sm text-gray-500">Horario</p>
                  <p className="font-medium text-gray-900">
                    {formatTime(cls.startsAt)} – {formatTime(cls.endsAt)}
                  </p>
                </div>
              </div>
            </div>

            {cls.instructorName && (
              <div className="flex items-center justify-between p-4 rounded-lg bg-gray-50">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">👤</span>
                  <div>
                    <p className="text-sm text-gray-500">Instructor</p>
                    <p className="font-medium text-gray-900">{cls.instructorName}</p>
                  </div>
                </div>
              </div>
            )}

            <div className="flex items-center justify-between p-4 rounded-lg bg-gray-50">
              <div className="flex items-center gap-3">
                <span className="text-2xl">👥</span>
                <div>
                  <p className="text-sm text-gray-500">Cupo máximo</p>
                  <p className="font-medium text-gray-900">{cls.maxCapacity} personas</p>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-3 pt-4 border-t border-gray-200">
            <Button variant="primary" size="lg" className="w-full" onClick={handleWhatsApp}>
              💬 Reservar por WhatsApp
            </Button>
            <Button variant="outline" size="lg" className="w-full" disabled>
              📱 Reservar en app (próximamente)
            </Button>
            <p className="text-center text-xs text-gray-500">
              La reservación consumirá 1 crédito de tu paquete.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}