import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { CircleCheck, Clock, MessageCircle } from "lucide-react";
import { useAuth } from "@/features/auth/hooks/AuthProvider";
import { Button } from "@/components/ui/Button";
import { EnrollAndPayModal } from "./EnrollAndPayModal";
import { TrialClassModal } from "./TrialClassModal";
import type { AcademyGroupCatalogItem } from "../types/AcademyGroup";

const DAY_ABBREVIATIONS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

function formatSchedule(group: AcademyGroupCatalogItem): string {
  if (group.schedules.length === 0) return "Sin horario";
  return group.schedules
    .map((s) => `${DAY_ABBREVIATIONS[s.dayOfWeek]} ${s.startTime.slice(0, 5)}–${s.endTime.slice(0, 5)}`)
    .join(", ");
}

function formatAgeRange(group: AcademyGroupCatalogItem): string {
  if (group.ageMin == null && group.ageMax == null) return "Todas las edades";
  if (group.ageMin != null && group.ageMax != null) return `${group.ageMin}–${group.ageMax} años`;
  if (group.ageMin != null) return `Desde ${group.ageMin} años`;
  return `Hasta ${group.ageMax} años`;
}

function formatWhatsAppLink(whatsappNumber: string | null, group: AcademyGroupCatalogItem): string {
  const message = encodeURIComponent(
    `Hola, quiero inscribir a mi hijo/a al grupo "${group.name}" de la Academia de Ballet.`,
  );
  if (!whatsappNumber) return `https://wa.me/?text=${message}`;
  const cleaned = whatsappNumber.replace(/\D/g, "");
  return `https://wa.me/52${cleaned}?text=${message}`;
}

export function AcademyGroupCard({
  group,
  whatsappNumber,
  registrationFeeCents,
}: {
  group: AcademyGroupCatalogItem;
  whatsappNumber: string | null;
  registrationFeeCents: number | null;
}) {
  const { session } = useAuth();
  const navigate = useNavigate();
  const [enrollModalOpen, setEnrollModalOpen] = useState(false);
  const [trialModalOpen, setTrialModalOpen] = useState(false);
  const [requestSent, setRequestSent] = useState<"enroll" | "trial" | null>(null);

  function requireSession(open: () => void) {
    if (!session) {
      navigate(`/login?redirectTo=${encodeURIComponent("/academy")}`);
      return;
    }
    open();
  }

  return (
    <article
      id={`academy-group-card-${group.id}`}
      className="flex h-full flex-col rounded-card border border-borde bg-tarjeta p-6 shadow-card"
    >
      <div className="flex flex-col gap-1">
        <h3 className="text-subtitulo font-medium text-texto">{group.name}</h3>
        {group.instructorName && <p className="text-pequeno text-texto-suave">Instructor: {group.instructorName}</p>}
      </div>

      <div className="mt-4 mb-6 flex flex-col gap-3">
        <p className="flex items-start gap-2 text-cuerpo text-texto">
          <Clock className="mt-0.5 h-4 w-4 shrink-0 text-acento" strokeWidth={1.6} aria-hidden="true" />
          {formatSchedule(group)}
        </p>
        <p className="self-start rounded-chip bg-suave px-2.5 py-1 text-pequeno font-medium text-texto">
          {formatAgeRange(group)}
        </p>
      </div>

      {requestSent && (
        <p role="status" className="mb-4 flex items-start gap-2 rounded-control bg-suave p-3 text-pequeno text-exito">
          <CircleCheck className="mt-px h-4 w-4 shrink-0" strokeWidth={1.8} aria-hidden="true" />
          {requestSent === "enroll"
            ? "Solicitud enviada. El staff la revisará pronto."
            : "Clase muestra solicitada. El staff confirmará tu lugar."}
        </p>
      )}

      <div className="mt-auto flex flex-col gap-2 border-t border-borde pt-5">
        <Button
          variant="primary"
          size="lg"
          className="w-full"
          onClick={() => requireSession(() => setEnrollModalOpen(true))}
        >
          Inscribir y pagar inscripción
        </Button>
        {group.schedules.length > 0 && (
          <Button
            variant="secondary"
            size="lg"
            className="w-full"
            onClick={() => requireSession(() => setTrialModalOpen(true))}
          >
            Agendar clase muestra
          </Button>
        )}
        <button
          type="button"
          onClick={() => window.open(formatWhatsAppLink(whatsappNumber, group), "_blank")}
          className="mx-auto inline-flex min-h-10 items-center gap-1.5 rounded-control px-3 text-pequeno text-texto-suave transition-colors duration-200 hover:text-acento"
        >
          <MessageCircle className="h-4 w-4" strokeWidth={1.6} aria-hidden="true" />
          O escríbenos por WhatsApp
        </button>
      </div>

      {enrollModalOpen && (
        <EnrollAndPayModal
          open={enrollModalOpen}
          groupId={group.id}
          groupName={group.name}
          registrationFeeCents={registrationFeeCents}
          onClose={() => setEnrollModalOpen(false)}
          onSuccess={() => setRequestSent("enroll")}
        />
      )}
      {trialModalOpen && (
        <TrialClassModal
          open={trialModalOpen}
          group={group}
          onClose={() => setTrialModalOpen(false)}
          onSuccess={() => setRequestSent("trial")}
        />
      )}
    </article>
  );
}
