import { Link } from "react-router-dom";
import { useAuth } from "@/features/auth/hooks/AuthProvider";

const PANEL_ITEMS = [
  { to: "/instructors", label: "Instructores" },
  { to: "/classes", label: "Clases" },
  { to: "/packages", label: "Paquetes" },
  { to: "/customers", label: "Clientes" },
  { to: "/students", label: "Alumnos" },
];

export function HomePage() {
  const { profile } = useAuth();

  return (
    <div id="admin-dashboard" className="mx-auto max-w-3xl p-12">
      <h1 className="mb-1 text-2xl font-semibold text-brand-primary">Panel administrativo</h1>
      <p className="mb-8 text-sm text-gray-500">
        {profile?.fullName ?? "Bienvenido"} - Rol: {profile?.role}
      </p>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        {PANEL_ITEMS.map((item) => (
          <Link
            key={item.to}
            to={item.to}
            className="flex items-center justify-center rounded-lg border border-gray-200 bg-white p-8 text-center text-base font-medium text-brand-primary shadow-sm hover:border-brand-primary hover:shadow-md"
          >
            {item.label}
          </Link>
        ))}
      </div>
    </div>
  );
}
