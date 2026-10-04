import { useState, type FormEvent } from "react";
import { z } from "zod";
import { CircleAlert, CircleCheck } from "lucide-react";
import { signInWithEmail, signUpWithEmail } from "../services/authService";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/TextField";
import { PasswordField } from "./PasswordField";
import { meetsPasswordRequirements } from "../utils/passwordRequirements";

type Mode = "login" | "register";

const loginSchema = z.object({
  email: z.string().email("Correo inválido"),
  password: z.string().min(8, "La contraseña debe tener al menos 8 caracteres"),
});

const registerSchema = loginSchema.extend({
  fullName: z.string().min(1, "El nombre es obligatorio"),
  password: z
    .string()
    .refine(
      meetsPasswordRequirements,
      "La contraseña no cumple los requisitos",
    ),
});

function mapAuthError(err: unknown): string {
  const message = err instanceof Error ? err.message : "";
  if (message.includes("Invalid login credentials")) {
    return "Correo o contraseña incorrectos.";
  }
  if (message.includes("User already registered")) {
    return "Ya existe una cuenta con ese correo.";
  }
  if (message.includes("Email not confirmed")) {
    return "Todavía no confirmas tu correo. Revisa tu bandeja de entrada.";
  }
  return "Ocurrió un error. Intenta de nuevo.";
}

export function EmailPasswordForm({
  mode,
  redirectTo,
  onForgotPassword,
}: {
  mode: Mode;
  redirectTo?: string;
  onForgotPassword?: () => void;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    setSuccessMessage(null);
    setFieldErrors({});

    const schema = mode === "register" ? registerSchema : loginSchema;
    const result = schema.safeParse(
      mode === "register" ? { email, password, fullName } : { email, password },
    );

    const errors: Record<string, string> = {};
    if (!result.success) {
      for (const issue of result.error.issues) {
        errors[String(issue.path[0])] = issue.message;
      }
    }
    if (mode === "register" && !acceptedTerms) {
      errors.terms = "Debes aceptar los términos y el aviso de privacidad";
    }
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setIsLoading(true);
    try {
      if (mode === "register") {
        const { needsEmailConfirmation } = await signUpWithEmail(email, password, fullName, new Date().toISOString(), redirectTo);
        if (needsEmailConfirmation) {
          setSuccessMessage(
            "Cuenta creada. Revisa tu correo para confirmarla antes de iniciar sesión.",
          );
        }
      } else {
        await signInWithEmail(email, password);
      }
    } catch (err) {
      setFormError(mapAuthError(err));
      console.error(
        `[auth] ${mode === "register" ? "signUpWithEmail" : "signInWithEmail"} fallo`,
        err,
      );
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <form
      id="email-password-form"
      onSubmit={handleSubmit}
      noValidate
      className="flex w-full flex-col gap-4"
    >
      {mode === "register" && (
        <TextField
          id="full-name-input"
          label="Nombre completo"
          type="text"
          autoComplete="name"
          value={fullName}
          onChange={(event) => setFullName(event.target.value)}
          error={fieldErrors.fullName}
        />
      )}

      <TextField
        id="email-input"
        label="Correo electrónico"
        type="email"
        inputMode="email"
        autoComplete="email"
        autoCapitalize="none"
        placeholder="tu@correo.com"
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        error={fieldErrors.email}
      />

      <PasswordField
        id="password-input"
        label="Contraseña"
        autoComplete={mode === "register" ? "new-password" : "current-password"}
        value={password}
        onChange={setPassword}
        error={fieldErrors.password}
        showRequirements={mode === "register"}
      />

      {mode === "register" && (
        <div id="register-terms-acceptance" className="flex flex-col gap-1">
          <label className="flex items-start gap-3 text-pequeno text-texto-suave">
            <input
              id="accept-terms-checkbox"
              type="checkbox"
              checked={acceptedTerms}
              onChange={(event) => setAcceptedTerms(event.target.checked)}
              aria-invalid={Boolean(fieldErrors.terms)}
              aria-describedby={fieldErrors.terms ? "accept-terms-error" : undefined}
              className="mt-0.5 h-5 w-5 shrink-0 accent-acento"
            />
            {/* Textos legales pendientes: ver docs/roadmap.md. Al existir, enlazar aqui. */}
            <span>
              Acepto los términos y condiciones, el reglamento del estudio y el aviso de privacidad de
              Merida Ballet Academy.
            </span>
          </label>
          {fieldErrors.terms && (
            <p id="accept-terms-error" role="alert" className="text-pequeno text-alerta">
              {fieldErrors.terms}
            </p>
          )}
        </div>
      )}

      {mode === "login" && onForgotPassword && (
        <button
          id="forgot-password-link"
          type="button"
          onClick={onForgotPassword}
          className="-mt-2 self-end rounded-chip text-pequeno text-texto-suave underline-offset-4 transition-colors duration-200 hover:text-acento hover:underline"
        >
          ¿Olvidaste tu contraseña?
        </button>
      )}

      <Button type="submit" size="lg" loading={isLoading} className="mt-2 w-full">
        {isLoading ? "Enviando…" : mode === "register" ? "Crear cuenta" : "Iniciar sesión"}
      </Button>

      {formError && (
        <p role="alert" className="alerta-entra flex items-start gap-2 text-pequeno text-alerta">
          <CircleAlert className="mt-px h-4 w-4 shrink-0" strokeWidth={1.8} aria-hidden="true" />
          {formError}
        </p>
      )}
      {successMessage && (
        <p role="status" className="flex items-start gap-2 rounded-control bg-suave p-3 text-pequeno text-exito">
          <CircleCheck className="mt-px h-4 w-4 shrink-0" strokeWidth={1.8} aria-hidden="true" />
          {successMessage}
        </p>
      )}
    </form>
  );
}
