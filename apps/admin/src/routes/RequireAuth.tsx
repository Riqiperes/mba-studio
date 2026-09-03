import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import type { UserRole } from "@mba-studio/shared";
import { useAuth } from "@/features/auth/hooks/AuthProvider";
import { SignOutButton } from "@/features/auth/components/SignOutButton";

// Cualquiera de estos roles puede entrar AL PANEL en general -- que rutas
// especificas ve cada uno lo decide `allowedRoles` por pagina.
const PANEL_ROLES: UserRole[] = ["STAFF", "BUSINESS_ADMIN", "SUPER_ADMIN", "INSTRUCTOR_ADMIN"];

type Props = {
  children: ReactNode;
  /**
   * Roles permitidos en ESTA ruta especifica. Por defecto, todo el panel
   * excepto INSTRUCTOR_ADMIN (rutas de staff normales). Pasar
   * `["INSTRUCTOR_ADMIN", ...PANEL_ROLES_SIN_CUSTOMER]` para paginas del
   * instructor, o un subconjunto mas chico (ej. solo BUSINESS_ADMIN/
   * SUPER_ADMIN) para paginas sensibles como /users.
   */
  allowedRoles?: UserRole[];
};

export function RequireAuth({ children, allowedRoles = ["STAFF", "BUSINESS_ADMIN", "SUPER_ADMIN"] }: Props) {
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

  if (!profile) {
    return (
      <div className="flex min-h-screen items-center justify-center text-gray-500">
        Cargando...
      </div>
    );
  }

  // El rol real lo decide la base de datos (tabla admin_allowed_emails +
  // el trigger que crea el profile, ver supabase/migrations/009, y el
  // vinculo instructor_id via /users, ver 021). Este guard solo refleja
  // ese resultado, nunca decide permisos por su cuenta.
  if (!PANEL_ROLES.includes(profile.role)) {
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

  if (!allowedRoles.includes(profile.role)) {
    // Un INSTRUCTOR_ADMIN que cae en una ruta de staff (por URL directa,
    // no por el nav) va a su propia pagina en vez de un callejon sin
    // salida -- cualquier otro caso (ej. STAFF entrando a /users) si es
    // "Sin acceso".
    if (profile.role === "INSTRUCTOR_ADMIN") {
      return <Navigate to="/instructor/my-classes" replace />;
    }
    return (
      <div
        id="access-denied"
        className="flex min-h-screen flex-col items-center justify-center gap-4 p-6 text-center"
      >
        <h1 className="text-xl font-semibold text-brand-primary">Sin acceso</h1>
        <p className="max-w-sm text-gray-600">Tu rol no tiene permiso para ver esta pagina.</p>
        <SignOutButton />
      </div>
    );
  }

  return children;
}
