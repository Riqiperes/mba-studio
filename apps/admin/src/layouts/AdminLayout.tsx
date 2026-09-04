import type { ReactNode } from "react";
import { NavLink } from "react-router-dom";
import { useAuth } from "@/features/auth/hooks/AuthProvider";
import { SignOutButton } from "@/features/auth/components/SignOutButton";

const INSTRUCTOR_NAV_ITEMS = [{ to: "/instructor/my-classes", label: "Mis clases" }];

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  isActive
    ? "text-sm font-medium text-brand-primary"
    : "text-sm font-medium text-gray-500 hover:text-brand-primary";

export function AdminLayout({ children }: { children: ReactNode }) {
  const { profile } = useAuth();
  const isInstructor = profile?.role === "INSTRUCTOR_ADMIN";
  const isBusinessAdmin = profile?.role === "BUSINESS_ADMIN" || profile?.role === "SUPER_ADMIN";
  const isSuperAdmin = profile?.role === "SUPER_ADMIN";

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
              {isBusinessAdmin && (
                <NavLink to="/users" className={navLinkClass}>
                  Usuarios
                </NavLink>
              )}
              {isSuperAdmin && (
                <NavLink to="/admins" className={navLinkClass}>
                  Admins
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
