import { Link } from "react-router-dom";
import { useAuth } from "@/features/auth/hooks/AuthProvider";
import { usePendingAcademyRequestsCount } from "@/features/academy/hooks/usePendingAcademyRequestsCount";

const HUB_ITEMS = [
  { to: "/estudio", label: "Estudio", icon: "🧘" },
  { to: "/academia", label: "Academia", icon: "🩰" },
] as const;

export function HomePage() {
  const { profile } = useAuth();
  const { count: pendingAcademyCount } = usePendingAcademyRequestsCount();

  return (
    <div id="admin-dashboard" className="mx-auto max-w-2xl p-12">
      <h1 className="mb-1 text-2xl font-semibold text-brand-primary">Panel administrativo</h1>
      <p className="mb-8 text-sm text-gray-500">
        {profile?.fullName ?? "Bienvenido"} - Rol: {profile?.role}
      </p>
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        {HUB_ITEMS.map((item) => (
          <Link
            key={item.to}
            to={item.to}
            className="relative flex flex-col items-center justify-center gap-3 rounded-lg border border-gray-200 bg-white p-12 text-center shadow-sm hover:border-brand-primary hover:shadow-md"
          >
            {item.to === "/academia" && pendingAcademyCount > 0 && (
              <span className="absolute right-3 top-3 flex h-6 min-w-6 items-center justify-center rounded-full bg-red-600 px-1.5 text-xs font-semibold text-white">
                {pendingAcademyCount}
              </span>
            )}
            <span className="text-5xl">{item.icon}</span>
            <span className="text-xl font-semibold text-brand-primary">{item.label}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
