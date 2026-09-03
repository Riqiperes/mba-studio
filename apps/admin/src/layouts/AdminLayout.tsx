import type { ReactNode } from "react";
import { NavLink } from "react-router-dom";
import { useAuth } from "@/features/auth/hooks/AuthProvider";
import { SignOutButton } from "@/features/auth/components/SignOutButton";

const ESTUDIO_ITEMS = [
  { to: "/packages", label: "Paquetes" },
  { to: "/instructors", label: "Instructores" },
  { to: "/customers", label: "Clientes" },
  { to: "/classes", label: "Clases" },
];

const ACADEMIA_ITEMS = [
  { to: "/students", label: "Ver lista de alumnos" },
  { to: "/academy/groups", label: "Ver lista de horarios" },
];

const INSTRUCTOR_NAV_ITEMS = [{ to: "/instructor/my-classes", label: "Mis clases" }];

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  isActive
    ? "text-sm font-medium text-brand-primary"
    : "text-sm font-medium text-gray-500 hover:text-brand-primary";

function NavDropdown({ label, items }: { label: string; items: { to: string; label: string }[] }) {
  return (
    <div className="group relative">
      <button type="button" className="text-sm font-medium text-gray-500 hover:text-brand-primary">
        {label}
      </button>
      <div className="absolute left-0 top-full z-10 hidden min-w-[180px] flex-col rounded-md border border-gray-200 bg-white py-1 shadow-lg group-hover:flex">
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `px-4 py-2 text-sm ${isActive ? "text-brand-primary" : "text-gray-700"} hover:bg-gray-50`
            }
          >
            {item.label}
          </NavLink>
        ))}
      </div>
    </div>
  );
}

export function AdminLayout({ children }: { children: ReactNode }) {
  const { profile } = useAuth();
  const isInstructor = profile?.role === "INSTRUCTOR_ADMIN";
  const isBusinessAdmin = profile?.role === "BUSINESS_ADMIN" || profile?.role === "SUPER_ADMIN";

  return (
    <div id="admin-layout" className="min-h-screen bg-gray-50">
      <nav className="flex items-center justify-between border-b border-gray-200 bg-white px-6 py-3">
        <div className="flex items-center gap-4">
          {isInstructor ? (
            INSTRUCTOR_NAV_ITEMS.map((item) => (
              <NavLink key={item.to} to={item.to} className={navLinkClass}>
                {item.label}
              </NavLink>
            ))
          ) : (
            <>
              <NavLink to="/" end className={navLinkClass}>
                Inicio
              </NavLink>
              <NavDropdown label="Estudio" items={ESTUDIO_ITEMS} />
              <NavDropdown label="Academia" items={ACADEMIA_ITEMS} />
              <NavLink to="/academy/overdue" className={navLinkClass}>
                Colegiaturas
              </NavLink>
              {isBusinessAdmin && (
                <NavLink to="/users" className={navLinkClass}>
                  Usuarios
                </NavLink>
              )}
            </>
          )}
        </div>
        <SignOutButton />
      </nav>
      <main>{children}</main>
    </div>
  );
}
