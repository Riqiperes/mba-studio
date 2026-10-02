import { Dumbbell, Music } from "lucide-react";
import { useAuth } from "@/features/auth/hooks/AuthProvider";
import { usePendingAcademyRequestsCount } from "@/features/academy/hooks/usePendingAcademyRequestsCount";
import { HubLinkCard } from "@/components/ui/HubLinkCard";

const HUB_ITEMS = [
  { to: "/estudio", label: "Estudio", description: "Clases, instructores, paquetes y clientes", Icon: Dumbbell },
  { to: "/academia", label: "Academia", description: "Horarios, alumnos y colegiaturas", Icon: Music },
] as const;

export function HomePage() {
  const { profile } = useAuth();
  const { count: pendingAcademyCount } = usePendingAcademyRequestsCount();

  return (
    <div id="admin-dashboard" className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-12">
      <header className="mb-8 space-y-2">
        <p className="etiqueta">Panel administrativo</p>
        <h1 className="font-display text-titulo font-medium sm:text-display-l">{profile?.fullName ?? "Bienvenido"}</h1>
        <p className="text-cuerpo text-texto-suave">
          Rol: <span className="font-medium text-texto">{profile?.role}</span>
        </p>
      </header>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6">
        {HUB_ITEMS.map((item) => (
          <HubLinkCard
            key={item.to}
            to={item.to}
            label={item.label}
            description={item.description}
            Icon={item.Icon}
            size="lg"
            badgeCount={item.to === "/academia" ? pendingAcademyCount : undefined}
            badgeLabel="solicitudes de Academia sin atender"
          />
        ))}
      </div>
    </div>
  );
}
