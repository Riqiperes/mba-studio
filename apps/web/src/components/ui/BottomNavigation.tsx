import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/features/auth/hooks/AuthProvider";

const NAV_ITEMS = [
  { to: "/", label: "Inicio", icon: "🏠" },
  { to: "/packages", label: "Paquetes", icon: "📦" },
  { to: "/classes", label: "Horarios", icon: "📅" },
  { to: "/profile", label: "Usuario", icon: "👤" },
] as const;

export function BottomNavigation() {
  const location = useLocation();
  const { session } = useAuth();

  return (
    <nav
      id="bottom-navigation"
      className="fixed bottom-0 left-0 right-0 z-50 border-t border-gray-200 bg-white pb-safe"
      role="navigation"
      aria-label="Navegación principal"
    >
      <div className="grid grid-cols-4">
        {NAV_ITEMS.map((item) => {
          const isActive = location.pathname === item.to ||
            (item.to !== "/" && location.pathname.startsWith(item.to));
          return (
            <Link
              key={item.to}
              to={item.to}
              className={`flex flex-col items-center gap-1 py-3 px-2 text-xs transition-colors ${
                isActive
                  ? "text-brand-primary"
                  : "text-gray-500 active:text-gray-700"
              }`}
              aria-current={isActive ? "page" : undefined}
            >
              <span className="text-xl" aria-hidden="true">{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
      {!session && (
        <div className="border-t border-gray-200 px-4 py-2 text-center">
          <Link to="/login" className="text-sm text-brand-primary hover:underline">
            Iniciar sesión
          </Link>
        </div>
      )}
    </nav>
  );
}