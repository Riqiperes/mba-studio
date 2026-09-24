import { useState } from "react";
import { Link, Navigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/features/auth/hooks/AuthProvider";
import { GoogleSignInButton } from "@/features/auth/components/GoogleSignInButton";
import { EmailPasswordForm } from "@/features/auth/components/EmailPasswordForm";
import { BrandLogo } from "@/components/ui/BrandLogo";

export function LoginPage() {
  const { session, loading } = useAuth();
  const [searchParams] = useSearchParams();
  const redirectTo = searchParams.get("redirectTo") || "/profile";
  const [mode, setMode] = useState<"login" | "register">("login");

  if (!loading && session) {
    return <Navigate to={redirectTo} replace />;
  }

  const isRegister = mode === "register";

  return (
    <div id="login-page" className="relative isolate grid min-h-dvh bg-superficie lg:grid-cols-[1.1fr_1fr]">
      {/* Foto de marca: solo en pantallas anchas */}
      <aside aria-hidden="true" className="tema-claro sticky top-0 hidden h-dvh overflow-hidden bg-cloud lg:block">
        <img src="/brand/bailarina-difuminada.jpg" alt="" className="h-full w-full object-cover object-[50%_28%]" />
        <div className="absolute inset-0 bg-[linear-gradient(0deg,var(--cloud-dancer)_0%,transparent_45%)]" />
        <p className="absolute bottom-12 left-12 max-w-sm font-display text-titulo font-medium text-texto">
          La danza es armonía y ritmo
        </p>
      </aside>

      <main className="relative flex flex-col items-center justify-center overflow-hidden px-4 py-10 pt-[max(2.5rem,env(safe-area-inset-top))] sm:px-8">
        <img
          src="/brand/monograma-linea.svg"
          alt=""
          aria-hidden="true"
          className="pointer-events-none absolute -right-24 -bottom-16 -z-10 w-[min(560px,110vw)] max-w-none opacity-35"
        />

        <div className="flex w-full max-w-sm flex-col gap-6">
          <Link to="/" aria-label="Merida Ballet Academy, ir al inicio" className="mx-auto rounded-chip">
            <BrandLogo variant="vertical" alt="" className="h-28" />
          </Link>

          <div className="rounded-card border border-borde bg-tarjeta p-6 shadow-card sm:p-8">
            <div className="mb-6 space-y-1 text-center">
              <h1 className="font-display text-titulo font-medium">MBA MID</h1>
              <p className="text-cuerpo text-texto-suave">
                {isRegister ? "Crea tu cuenta para continuar" : "Inicia sesión para continuar"}
              </p>
            </div>

            <GoogleSignInButton redirectTo={redirectTo} />

            <div className="my-5 flex items-center gap-3 text-pequeno text-texto-suave">
              <div className="h-px flex-1 bg-borde" />o<div className="h-px flex-1 bg-borde" />
            </div>

            <EmailPasswordForm mode={mode} redirectTo={redirectTo} />
          </div>

          <button
            id="auth-mode-toggle-link"
            type="button"
            onClick={() => setMode(isRegister ? "login" : "register")}
            className="mx-auto min-h-10 rounded-chip px-2 text-cuerpo text-texto-suave transition-colors duration-200 hover:text-texto"
          >
            {isRegister ? "¿Ya tienes cuenta? " : "¿No tienes cuenta? "}
            <span className="font-medium text-acento underline decoration-acento/40 underline-offset-4">
              {isRegister ? "Inicia sesión" : "Crea una"}
            </span>
          </button>
        </div>
      </main>
    </div>
  );
}
