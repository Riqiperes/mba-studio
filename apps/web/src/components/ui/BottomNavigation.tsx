import type { ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/features/auth/hooks/AuthProvider";

// Iconos de trazo 1.75px (texto 400-500), un solo SVG recoloreado por estado.
const ICON_PATHS: Record<string, ReactNode> = {
  home: (
    <>
      <path d="M3.5 10.5 12 3.5l8.5 7" />
      <path d="M5.5 9v10.5a1 1 0 0 0 1 1H10v-5.5h4v5.5h3.5a1 1 0 0 0 1-1V9" />
    </>
  ),
  ticket: (
    <>
      <path d="M2.5 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h15a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2h-15a2 2 0 0 0-2 2Z" />
      <path d="M14 5v2M14 11v2M14 17v2" />
    </>
  ),
  calendar: (
    <>
      <rect x="3.5" y="4.5" width="17" height="16" rx="2.5" />
      <path d="M8 2.5v4M16 2.5v4M3.5 10h17" />
    </>
  ),
  music: (
    <>
      <path d="M9 18V5.5l11-2V16" />
      <circle cx="6.5" cy="18" r="2.5" />
      <circle cx="17.5" cy="16" r="2.5" />
    </>
  ),
  user: (
    <>
      <circle cx="12" cy="8" r="4" />
      <path d="M4.5 20.5a7.5 7.5 0 0 1 15 0" />
    </>
  ),
};

const NAV_ITEMS = [
  { to: "/", label: "Inicio", icon: "home" },
  { to: "/packages", label: "Paquetes", icon: "ticket" },
  { to: "/classes", label: "Horarios", icon: "calendar" },
  { to: "/academy", label: "Academia", icon: "music" },
  { to: "/profile", label: "Usuario", icon: "user" },
] as const;

export function BottomNavigation() {
  const location = useLocation();
  const { session } = useAuth();

  return (
    <nav
      id="bottom-navigation"
      className="fixed inset-x-0 bottom-0 z-40 bg-surface/95 pb-[env(safe-area-inset-bottom)] shadow-bar backdrop-blur-md"
      aria-label="Navegación principal"
    >
      <ul className="mx-auto grid max-w-lg grid-cols-5 px-1">
        {NAV_ITEMS.map((item) => {
          const isActive = location.pathname === item.to ||
            (item.to !== "/" && location.pathname.startsWith(item.to));

          // Si no hay sesión y es el perfil, redirigir a login con redirectTo
          const href = !session && item.to === "/profile"
            ? `/login?redirectTo=${encodeURIComponent(item.to)}`
            : item.to;

          return (
            <li key={item.to}>
              <Link
                to={href}
                className={`group flex min-h-16 flex-col items-center justify-center gap-0.5 text-xs transition-colors duration-150 ${
                  isActive ? "font-medium text-accent" : "text-ink-muted hover:text-ink"
                }`}
                aria-current={isActive ? "page" : undefined}
              >
                <span
                  className={`grid h-8 w-14 place-items-center rounded-full transition-[background-color,scale] duration-150 ease-(--ease-brand) group-active:scale-[0.96] ${
                    isActive ? "bg-accent-soft" : "group-active:bg-gray-100"
                  }`}
                >
                  <svg
                    className="h-[22px] w-[22px]"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={isActive ? 2 : 1.75}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    {ICON_PATHS[item.icon]}
                  </svg>
                </span>
                <span>{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
