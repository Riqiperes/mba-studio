import { Link, Outlet } from "react-router-dom";
import { useAuth } from "@/features/auth/hooks/AuthProvider";
import { SignOutButton } from "@/features/auth/components/SignOutButton";

export function MainLayout() {
  const { profile } = useAuth();

  const navItems = [
    { to: "/", label: "Inicio" },
    { to: "/packages", label: "Paquetes" },
    { to: "/classes", label: "Horario" },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto max-w-5xl px-4 py-4 flex items-center justify-between">
          <Link to="/" className="text-xl font-bold text-brand-primary">
            MBA MID
          </Link>
          <nav className="hidden md:flex items-center gap-6">
            {navItems.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className="text-sm font-medium text-gray-600 hover:text-brand-primary transition-colors"
              >
                {item.label}
              </Link>
            ))}
            <div className="flex items-center gap-4">
              {profile && (
                <span className="text-sm text-gray-500">{profile.fullName ?? "Usuario"}</span>
              )}
              <SignOutButton />
            </div>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-8">
        <Outlet />
      </main>

      <footer className="border-t border-gray-200 bg-white">
        <div className="mx-auto max-w-5xl px-4 py-6 text-center text-sm text-gray-500">
          MBA MID — Estudio de Pilates & Academia de Ballet
        </div>
      </footer>
    </div>
  );
}