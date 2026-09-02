import { useState } from "react";
import { Navigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/features/auth/hooks/AuthProvider";
import { GoogleSignInButton } from "@/features/auth/components/GoogleSignInButton";
import { EmailPasswordForm } from "@/features/auth/components/EmailPasswordForm";

export function LoginPage() {
  const { session, loading } = useAuth();
  const [searchParams] = useSearchParams();
  const redirectTo = searchParams.get("redirectTo") || "/profile";
  const [mode, setMode] = useState<"login" | "register">("login");

  if (!loading && session) {
    return <Navigate to={redirectTo} replace />;
  }

  return (
    <div
      id="login-page"
      className="flex min-h-screen flex-col items-center justify-center gap-6 p-6"
    >
      <h1 className="text-2xl font-semibold text-brand-primary">MBA MID</h1>
      <p className="text-gray-600">
        {mode === "register" ? "Crea tu cuenta para continuar" : "Inicia sesion para continuar"}
      </p>
      <GoogleSignInButton redirectTo={redirectTo} />

      <div className="flex w-full max-w-xs items-center gap-3 text-xs text-gray-400">
        <div className="h-px flex-1 bg-gray-200" />o<div className="h-px flex-1 bg-gray-200" />
      </div>

      <EmailPasswordForm mode={mode} redirectTo={redirectTo} />

      <button
        id="auth-mode-toggle-link"
        type="button"
        onClick={() => setMode(mode === "login" ? "register" : "login")}
        className="text-sm text-brand-accent underline"
      >
        {mode === "login" ? "¿No tienes cuenta? Crea una" : "¿Ya tienes cuenta? Inicia sesion"}
      </button>
    </div>
  );
}