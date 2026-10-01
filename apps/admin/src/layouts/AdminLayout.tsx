import type { ReactNode } from "react";
import { CalendarDays, House, ShieldCheck, Users } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Link, NavLink } from "react-router-dom";
import { useAuth } from "@/features/auth/hooks/AuthProvider";
import { SignOutButton } from "@/features/auth/components/SignOutButton";
import { BrandLogo } from "@/components/ui/BrandLogo";

type NavItem = { to: string; label: string; Icon: LucideIcon; end?: boolean };

const INSTRUCTOR_NAV_ITEMS: NavItem[] = [{ to: "/instructor/my-classes", label: "Mis clases", Icon: CalendarDays }];

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  `inline-flex min-h-10 shrink-0 items-center gap-2 rounded-control px-3 text-pequeno font-medium transition-colors duration-200 ${
    isActive ? "bg-acento-suave text-acento" : "text-texto-suave hover:bg-suave hover:text-texto"
  }`;

export function AdminLayout({ children }: { children: ReactNode }) {
  const { profile } = useAuth();
  const isInstructor = profile?.role === "INSTRUCTOR_ADMIN";
  const isBusinessAdmin = profile?.role === "BUSINESS_ADMIN" || profile?.role === "SUPER_ADMIN";
  const isSuperAdmin = profile?.role === "SUPER_ADMIN";

  const navItems: NavItem[] = isInstructor
    ? INSTRUCTOR_NAV_ITEMS
    : [
        { to: "/", label: "Inicio", Icon: House, end: true },
        ...(isBusinessAdmin ? [{ to: "/users", label: "Usuarios", Icon: Users }] : []),
        ...(isSuperAdmin ? [{ to: "/admins", label: "Admins", Icon: ShieldCheck }] : []),
      ];

  return (
    <div id="admin-layout" className="relative min-h-dvh bg-superficie">
      {/* Fondo decorativo discreto: el panel es herramienta de trabajo */}
      <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <img
          src="/brand/monograma-linea.svg"
          alt=""
          className="absolute -right-24 -bottom-20 w-[min(620px,110vw)] max-w-none opacity-20"
        />
      </div>

      <a
        href="#admin-main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:rounded-control focus:bg-tarjeta focus:px-4 focus:py-2 focus:text-pequeno focus:shadow-card"
      >
        Saltar al contenido
      </a>

      <header
        id="admin-header"
        className="sticky top-0 z-30 border-b border-borde bg-tarjeta/90 pt-[env(safe-area-inset-top)] backdrop-blur-md"
      >
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3 sm:px-6">
          <Link to={isInstructor ? "/instructor/my-classes" : "/"} className="flex items-center gap-3 rounded-chip">
            <BrandLogo variant="horizontal" alt="Merida Ballet Academy" className="h-9" />
            <span className="hidden border-s border-borde ps-3 text-pequeno font-medium text-texto-suave sm:inline">
              Panel
            </span>
          </Link>

          <nav aria-label="Navegación del panel" className="order-last -mx-1 flex w-full gap-1 overflow-x-auto px-1 sm:order-none sm:w-auto sm:flex-1">
            {navItems.map(({ to, label, Icon, end }) => (
              <NavLink key={to} to={to} end={end ?? false} className={navLinkClass}>
                <Icon className="h-[18px] w-[18px]" strokeWidth={1.6} aria-hidden="true" />
                {label}
              </NavLink>
            ))}
          </nav>

          <div className="ms-auto flex items-center gap-3">
            {profile?.fullName && (
              <span className="hidden max-w-48 truncate text-pequeno text-texto-suave md:inline" title={profile.fullName}>
                {profile.fullName}
              </span>
            )}
            <SignOutButton />
          </div>
        </div>
      </header>

      <main id="admin-main-content" className="relative z-10 pb-[calc(2rem+env(safe-area-inset-bottom))]">
        {children}
      </main>
    </div>
  );
}
