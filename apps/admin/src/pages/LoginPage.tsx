import { Navigate } from "react-router-dom";
import { useAuth } from "@/features/auth/hooks/AuthProvider";
import { GoogleSignInButton } from "@/features/auth/components/GoogleSignInButton";

export function LoginPage() {
  const { session, loading } = useAuth();

  if (!loading && session) {
    return <Navigate to="/" replace />;
  }

  return (
    <div
      id="login-page"
      className="flex min-h-screen flex-col items-center justify-center gap-6 p-6"
    >
      <h1 className="text-2xl font-semibold text-brand-primary">MBA MID - Panel administrativo</h1>
      <p className="text-gray-600">Inicia sesion para continuar</p>
      <GoogleSignInButton />
    </div>
  );
}
