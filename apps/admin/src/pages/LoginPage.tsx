import { Navigate } from "react-router-dom";
import { useAuth } from "@/features/auth/hooks/AuthProvider";
import { GoogleSignInButton } from "@/features/auth/components/GoogleSignInButton";
import { BrandLogo } from "@/components/ui/BrandLogo";

export function LoginPage() {
  const { session, loading } = useAuth();

  if (!loading && session) {
    return <Navigate to="/" replace />;
  }

  return (
    <div
      id="login-page"
      className="relative isolate flex min-h-dvh flex-col items-center justify-center overflow-hidden bg-superficie px-4 py-10"
    >
      <img
        src="/brand/monograma-linea.svg"
        alt=""
        aria-hidden="true"
        className="pointer-events-none absolute -right-24 -bottom-16 -z-10 w-[min(620px,120vw)] max-w-none opacity-30"
      />
      <div className="flex w-full max-w-sm flex-col items-center gap-6">
        <BrandLogo variant="vertical" alt="Merida Ballet Academy" className="h-28" />
        <div className="w-full rounded-card border border-borde bg-tarjeta p-6 text-center shadow-card sm:p-8">
          <p className="etiqueta">Panel administrativo</p>
          <h1 className="mt-2 font-display text-titulo font-medium">MBA MID</h1>
          <p className="mt-1 mb-6 text-cuerpo text-texto-suave">Inicia sesión para continuar</p>
          <GoogleSignInButton />
        </div>
      </div>
    </div>
  );
}
