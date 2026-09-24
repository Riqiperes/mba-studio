import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/features/auth/hooks/AuthProvider";
import { LoadingState } from "@/components/ui/LoadingState";

export function RequireAuth({ children }: { children: ReactNode }) {
  const { session, loading } = useAuth();

  if (loading) {
    return <LoadingState id="auth-loading-screen" fullScreen message="Cargando tu cuenta…" />;
  }

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  return children;
}
