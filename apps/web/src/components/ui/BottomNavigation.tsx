import { CalendarDays, House, Music, Ticket, User } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/features/auth/hooks/AuthProvider";

const NAV_ITEMS = [
  { to: "/", label: "Inicio", Icon: House },
  { to: "/packages", label: "Paquetes", Icon: Ticket },
  { to: "/classes", label: "Horarios", Icon: CalendarDays },
  { to: "/academy", label: "Academia", Icon: Music },
  { to: "/profile", label: "Usuario", Icon: User },
] as const;

export function BottomNavigation() {
  const location = useLocation();
  const { session } = useAuth();

  return (
    <nav
      id="bottom-navigation"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-borde bg-tarjeta/95 pb-[env(safe-area-inset-bottom)] shadow-nav backdrop-blur-md"
      aria-label="Navegación principal"
    >
      <ul className="mx-auto grid max-w-lg grid-cols-5">
        {NAV_ITEMS.map(({ to, label, Icon }) => {
          const isActive = location.pathname === to ||
            (to !== "/" && location.pathname.startsWith(to));

          // Si no hay sesión y es el perfil, redirigir a login con redirectTo
          const href = !session && to === "/profile"
            ? `/login?redirectTo=${encodeURIComponent(to)}`
            : to;

          return (
            <li key={to}>
              <Link
                to={href}
                className={`group flex min-h-[68px] flex-col items-center justify-center gap-1 text-pequeno transition-colors duration-200 ${
                  isActive ? "font-medium text-acento" : "text-texto-suave hover:text-texto"
                }`}
                aria-current={isActive ? "page" : undefined}
              >
                <span
                  className={`grid h-[34px] w-16 place-items-center rounded-full transition-[background-color,scale] duration-200 ease-(--ease-brand) group-active:scale-[0.96] ${
                    isActive ? "bg-acento-suave" : "group-active:bg-suave"
                  }`}
                >
                  <Icon className="h-[22px] w-[22px]" strokeWidth={1.6} aria-hidden="true" />
                </span>
                <span>{label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
