import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { CircleAlert } from "lucide-react";
import { useAuth } from "@/features/auth/hooks/AuthProvider";
import { PasswordField } from "@/features/auth/components/PasswordField";
import { updatePassword } from "@/features/auth/services/authService";
import { meetsPasswordRequirements } from "@/features/auth/utils/passwordRequirements";
import { BrandLogo } from "@/components/ui/BrandLogo";
import { Button } from "@/components/ui/Button";
import { LoadingState } from "@/components/ui/LoadingState";
import { buttonClasses } from "@/components/ui/buttonStyles";

/**
 * Destino del enlace del correo "Reset password". Supabase abre una sesion
 * de recuperacion al llegar (detectSessionInUrl); con ella se guarda la
 * contrasena nueva. Sin sesion, el enlace ya expiro o se uso.
 */
export function ResetPasswordPage() {
  const { session, loading } = useAuth();
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [passwordError, setPasswordError] = useState<string | undefined>();
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    if (!meetsPasswordRequirements(password)) {
      setPasswordError("La contraseña no cumple los requisitos");
      return;
    }
    setPasswordError(undefined);
    setIsSaving(true);
    try {
      await updatePassword(password);
      navigate("/profile", { replace: true });
    } catch (err) {
      setFormError("No se pudo guardar la contraseña. Pide un enlace nuevo e intenta otra vez.");
      console.error("[auth] updatePassword fallo", err);
    } finally {
      setIsSaving(false);
    }
  }

  if (loading) return <LoadingState message="Cargando…" />;

  return (
    <main
      id="reset-password-page"
      className="flex min-h-dvh flex-col items-center justify-center bg-superficie px-4 py-10 pt-[max(2.5rem,env(safe-area-inset-top))]"
    >
      <div className="flex w-full max-w-sm flex-col gap-6">
        <Link to="/" aria-label="Merida Ballet Academy, ir al inicio" className="mx-auto rounded-chip">
          <BrandLogo variant="vertical" alt="" className="h-28" />
        </Link>

        <div className="rounded-card border border-borde bg-tarjeta p-6 shadow-card sm:p-8">
          <h1 className="mb-6 text-center font-display text-titulo font-medium">Nueva contraseña</h1>

          {session ? (
            <form id="reset-password-form" onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
              <PasswordField
                id="new-password-input"
                label="Contraseña nueva"
                autoComplete="new-password"
                value={password}
                onChange={setPassword}
                error={passwordError}
                showRequirements
              />
              <Button type="submit" size="lg" loading={isSaving} className="mt-2 w-full">
                {isSaving ? "Guardando…" : "Guardar contraseña"}
              </Button>
              {formError && (
                <p role="alert" className="alerta-entra flex items-start gap-2 text-pequeno text-alerta">
                  <CircleAlert className="mt-px h-4 w-4 shrink-0" strokeWidth={1.8} aria-hidden="true" />
                  {formError}
                </p>
              )}
            </form>
          ) : (
            <div className="flex flex-col gap-4 text-center">
              <p className="text-cuerpo text-texto-suave">
                Este enlace ya expiró o ya se usó. Pide uno nuevo desde "¿Olvidaste tu contraseña?".
              </p>
              <Link to="/login" className={buttonClasses("primary", "lg")}>
                Ir a iniciar sesión
              </Link>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
