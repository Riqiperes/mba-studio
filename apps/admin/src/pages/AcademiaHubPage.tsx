import { Link } from "react-router-dom";
import { ArrowRight, CalendarDays, CircleAlert, GraduationCap } from "lucide-react";
import { BackButton } from "@/components/ui/BackButton";
import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { HubLinkCard } from "@/components/ui/HubLinkCard";
import { usePendingAcademyRequestsCount } from "@/features/academy/hooks/usePendingAcademyRequestsCount";

const ACADEMIA_ITEMS = [
  { to: "/academy/groups", label: "Ver horarios", Icon: CalendarDays },
  { to: "/students", label: "Ver alumnos", Icon: GraduationCap },
];

export function AcademiaHubPage() {
  const { count: pendingCount } = usePendingAcademyRequestsCount();

  return (
    <div id="academia-hub-page" className="mx-auto max-w-3xl p-4 sm:p-6">
      <BackButton />
      <ScreenHeader eyebrow="Academia de Ballet" title="Academia" />
      {pendingCount > 0 && (
        <p role="status" className="mb-4 flex items-start gap-2 rounded-control bg-acento-suave p-3 text-pequeno font-medium text-acento">
          <CircleAlert className="mt-px h-4 w-4 shrink-0" strokeWidth={1.8} aria-hidden="true" />
          <span>
            {pendingCount} solicitud{pendingCount === 1 ? "" : "es"} nueva{pendingCount === 1 ? "" : "s"} sin
            atender — revisa "Ver horarios" y entra al grupo correspondiente.
          </span>
        </p>
      )}
      <div className="grid grid-cols-2 gap-3 sm:gap-4">
        {ACADEMIA_ITEMS.map((item) => (
          <HubLinkCard key={item.to} to={item.to} label={item.label} Icon={item.Icon} />
        ))}
      </div>
      <Link
        to="/academy/overdue"
        className="mt-4 inline-flex min-h-10 items-center gap-1.5 rounded-control px-1 text-pequeno font-medium text-texto-suave transition-colors duration-200 hover:text-acento"
      >
        Ver colegiaturas atrasadas
        <ArrowRight className="h-4 w-4" strokeWidth={1.6} aria-hidden="true" />
      </Link>
    </div>
  );
}
