import type { ReactNode } from "react";
import { NavLink } from "react-router-dom";
import { SignOutButton } from "@/features/auth/components/SignOutButton";

const NAV_ITEMS = [
  { to: "/", label: "Inicio" },
  { to: "/instructors", label: "Instructores" },
  { to: "/classes", label: "Clases" },
  { to: "/packages", label: "Paquetes" },
  { to: "/customers", label: "Clientes" },
  { to: "/students", label: "Alumnos" },
];

export function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div id="admin-layout" className="min-h-screen bg-gray-50">
      <nav className="flex items-center justify-between border-b border-gray-200 bg-white px-6 py-3">
        <div className="flex gap-4">
          {NAV_ITEMS.map((item) => (
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
