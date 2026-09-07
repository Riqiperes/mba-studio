import { Button } from "@/components/ui/Button";
import type { AcademyGroupCatalogItem } from "../types/AcademyGroup";

const DAY_ABBREVIATIONS = ["Dom", "Lun", "Mar", "Mie", "Jue", "Vie", "Sab"];

function formatSchedule(group: AcademyGroupCatalogItem): string {
  if (group.schedules.length === 0) return "Sin horario";
  return group.schedules
    .map((s) => `${DAY_ABBREVIATIONS[s.dayOfWeek]} ${s.startTime.slice(0, 5)}-${s.endTime.slice(0, 5)}`)
    .join(", ");
}

function formatAgeRange(group: AcademyGroupCatalogItem): string {
  if (group.ageMin == null && group.ageMax == null) return "Todas las edades";
  if (group.ageMin != null && group.ageMax != null) return `${group.ageMin}-${group.ageMax} años`;
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
}: {
  group: AcademyGroupCatalogItem;
  whatsappNumber: string | null;
}) {
  return (
    <article
      id={`academy-group-card-${group.id}`}
      className="flex flex-col h-full rounded-lg border border-gray-200 bg-white p-6 shadow-sm"
    >
      <div className="mb-4 flex flex-col gap-1">
        <h3 className="text-lg font-semibold text-brand-primary">{group.name}</h3>
        {group.instructorName && <p className="text-sm text-gray-600">Instructor: {group.instructorName}</p>}
      </div>

      <div className="mb-4 flex flex-col gap-1 text-sm text-gray-700">
        <p>{formatSchedule(group)}</p>
        <p>{formatAgeRange(group)}</p>
      </div>

      <div className="mt-auto pt-4 border-t border-gray-100">
        <Button
          variant="primary"
          size="lg"
          className="w-full"
          onClick={() => window.open(formatWhatsAppLink(whatsappNumber, group), "_blank")}
        >
          💬 Inscribir por WhatsApp
        </Button>
      </div>
    </article>
  );
}
