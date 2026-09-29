import type { ReactNode } from "react";
import { Navigate, Outlet } from "react-router-dom";
import type { UserRole } from "@mba-studio/shared";
import { useAuth } from "@/features/auth/hooks/AuthProvider";
import { SignOutButton } from "@/features/auth/components/SignOutButton";
import { BrandLogo } from "@/components/ui/BrandLogo";
import { LoadingState } from "@/components/ui/LoadingState";
import { AdminLayout } from "@/layouts/AdminLayout";

// Cualquiera de estos roles puede entrar AL PANEL en general -- que rutas
// especificas ve cada uno lo decide `RequireRole` por pagina.
const PANEL_ROLES: UserRole[] = ["STAFF", "BUSINESS_ADMIN", "SUPER_ADMIN", "INSTRUCTOR_ADMIN"];

/**
 * Guarda la sesion y monta `AdminLayout` UNA sola vez como layout padre de
 * las rutas del panel (via `<Outlet />`). Antes cada ruta envolvia su
 * propio `<AdminLayout>`, asi que el header y el logo se desmontaban y
 * volvian a montar en cada navegacion -- esa era la causa del logo del
 * header "a veces" sin cargar. El chequeo de rol especifico por pagina
 * vive en `RequireRole`, ya dentro de este layout.
 */
export function RequireAuth() {
  const { session, profile, loading } = useAuth();

  if (loading) {
    return <LoadingState id="admin-auth-loading" fullScreen message="Cargando el panel…" />;
  }

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  if (!profile) {
    return <LoadingState id="admin-auth-loading" fullScreen message="Cargando el panel…" />;
  }

  // El rol real lo decide la base de datos (tabla admin_allowed_emails +
  // el trigger que crea el profile, ver supabase/migrations/009, y el
  // vinculo instructor_id via /users, ver 021). Este guard solo refleja
  // ese resultado, nunca decide permisos por su cuenta.
  if (!PANEL_ROLES.includes(profile.role)) {
    return (
      <AccessDeniedScreen>
        Tu cuenta ({profile.fullName ?? "sin nombre"}) no tiene permiso para
        entrar al panel administrativo.
      </AccessDeniedScreen>
    );
  }

  return (
    <AdminLayout>
      <Outlet />
    </AdminLayout>
  );
}

type RequireRoleProps = {
  children: ReactNode;
  /**
   * Roles permitidos en ESTA pagina. Por defecto, todo el panel excepto
   * INSTRUCTOR_ADMIN (paginas de staff normales). Pasar un subconjunto
   * mas chico (ej. solo BUSINESS_ADMIN/SUPER_ADMIN) para paginas
   * sensibles como /users, o incluir INSTRUCTOR_ADMIN para sus paginas.
   */
  allowedRoles?: UserRole[];
};

/** Chequeo de rol por pagina, ya dentro del layout del panel (`RequireAuth`). */
export function RequireRole({ children, allowedRoles = ["STAFF", "BUSINESS_ADMIN", "SUPER_ADMIN"] }: RequireRoleProps) {
  const { profile } = useAuth();

  if (!profile || allowedRoles.includes(profile.role)) {
    return children;
  }

  // Un INSTRUCTOR_ADMIN que cae en una ruta de staff (por URL directa, no
  // por el nav) va a su propia pagina en vez de un callejon sin salida --
  // cualquier otro caso (ej. STAFF entrando a /users) si es "Sin acceso".
  if (profile.role === "INSTRUCTOR_ADMIN") {
    return <Navigate to="/instructor/my-classes" replace />;
  }

  return <AccessDeniedScreen>Tu rol no tiene permiso para ver esta página.</AccessDeniedScreen>;
}

function AccessDeniedScreen({ children }: { children: ReactNode }) {
  return (
    <div id="access-denied" className="flex min-h-dvh items-center justify-center bg-superficie p-6">
      <div className="flex max-w-sm flex-col items-center gap-4 rounded-card border border-borde bg-tarjeta p-8 text-center shadow-card">
        <BrandLogo variant="monogram" alt="" className="h-16 opacity-80" />
        <h1 className="font-display text-titulo font-medium">Sin acceso</h1>
        <p className="text-cuerpo text-texto-suave text-pretty">{children}</p>
        <SignOutButton />
      </div>
    </div>
  );
}
