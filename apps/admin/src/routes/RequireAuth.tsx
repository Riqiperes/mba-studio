import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/features/auth/hooks/AuthProvider";
import { SignOutButton } from "@/features/auth/components/SignOutButton";

const STAFF_ROLES = ["STAFF", "BUSINESS_ADMIN", "SUPER_ADMIN"];

export function RequireAuth({ children }: { children: ReactNode }) {
  const { session, profile, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-gray-500">
        Cargando...
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  // El rol real lo decide la base de datos (tabla admin_allowed_emails +
  // el trigger que crea el profile, ver supabase/migrations/009). Este
  // guard solo refleja ese resultado, nunca decide permisos por su cuenta.
  if (profile && !STAFF_ROLES.includes(profile.role)) {
    return (
      <div
        id="access-denied"
        className="flex min-h-screen flex-col items-center justify-center gap-4 p-6 text-center"
      >
        <h1 className="text-xl font-semibold text-brand-primary">Sin acceso</h1>
        <p className="max-w-sm text-gray-600">
          Tu cuenta ({profile.fullName ?? "sin nombre"}) no tiene permiso para
          entrar al panel administrativo.
        </p>
        <SignOutButton />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex min-h-screen items-center justify-center text-gray-500">
        Cargando...
      </div>
    );
  }

  return children;
}
