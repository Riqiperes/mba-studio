import { CalendarDays, Ticket, UserRound, Users } from "lucide-react";
import { BackButton } from "@/components/ui/BackButton";
import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { HubLinkCard } from "@/components/ui/HubLinkCard";

const ESTUDIO_ITEMS = [
  { to: "/classes", label: "Clases", Icon: CalendarDays },
  { to: "/instructors", label: "Instructores", Icon: UserRound },
  { to: "/packages", label: "Paquetes", Icon: Ticket },
  { to: "/customers", label: "Clientes", Icon: Users },
];

export function EstudioHubPage() {
  return (
    <div id="estudio-hub-page" className="mx-auto max-w-3xl p-4 sm:p-6">
      <BackButton />
      <ScreenHeader eyebrow="Estudio de Pilates" title="Estudio" />
      <div className="grid grid-cols-2 gap-3 sm:gap-4">
        {ESTUDIO_ITEMS.map((item) => (
          <HubLinkCard key={item.to} to={item.to} label={item.label} Icon={item.Icon} />
        ))}
      </div>
    </div>
  );
}
