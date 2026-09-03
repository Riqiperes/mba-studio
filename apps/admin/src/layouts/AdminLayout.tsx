import type { ReactNode } from "react";
import { NavLink } from "react-router-dom";
import { useAuth } from "@/features/auth/hooks/AuthProvider";
import { SignOutButton } from "@/features/auth/components/SignOutButton";

const STAFF_NAV_ITEMS = [
  { to: "/", label: "Inicio" },
  { to: "/instructors", label: "Instructores" },
  { to: "/classes", label: "Clases" },
  { to: "/packages", label: "Paquetes" },
  { to: "/customers", label: "Clientes" },
  { to: "/students", label: "Alumnos" },
  { to: "/academy/groups", label: "Academia" },
  { to: "/academy/overdue", label: "Colegiaturas" },
];

const ADMIN_ONLY_NAV_ITEMS = [{ to: "/users", label: "Usuarios" }];

const INSTRUCTOR_NAV_ITEMS = [{ to: "/instructor/my-classes", label: "Mis clases" }];

export function AdminLayout({ children }: { children: ReactNode }) {
  const { profile } = useAuth();
  const isInstructor = profile?.role === "INSTRUCTOR_ADMIN";
  const isBusinessAdmin = profile?.role === "BUSINESS_ADMIN" || profile?.role === "SUPER_ADMIN";
  const navItems = isInstructor
    ? INSTRUCTOR_NAV_ITEMS
    : [...STAFF_NAV_ITEMS, ...(isBusinessAdmin ? ADMIN_ONLY_NAV_ITEMS : [])];

  return (
    <div id="admin-layout" className="min-h-screen bg-gray-50">
      <nav className="flex items-center justify-between border-b border-gray-200 bg-white px-6 py-3">
        <div className="flex gap-4">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/"}
              className={({ isActive }) =>
                isActive
                  ? "text-sm font-medium text-brand-primary"
                  : "text-sm font-medium text-gray-500 hover:text-brand-primary"
              }
            >
              {item.label}
            </NavLink>
          ))}
        </div>
        <SignOutButton />
      </nav>
      <main>{children}</main>
    </div>
  );
}
