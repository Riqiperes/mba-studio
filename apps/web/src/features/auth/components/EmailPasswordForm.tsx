import { useState, type FormEvent } from "react";
import { z } from "zod";
import { Check, CircleAlert, CircleCheck, Eye, EyeOff, Minus } from "lucide-react";
import { signInWithEmail, signUpWithEmail } from "../services/authService";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/TextField";

type Mode = "login" | "register";

const loginSchema = z.object({
  email: z.string().email("Correo inválido"),
  password: z.string().min(8, "La contraseña debe tener al menos 8 caracteres"),
});

// Requisitos visibles en el registro; el mismo arreglo valida y pinta la
// lista, para que nunca se desincronicen.
const PASSWORD_REQUIREMENTS = [
  { label: "Al menos 8 caracteres", test: (value: string) => value.length >= 8 },
  { label: "Al menos una letra", test: (value: string) => /[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]/.test(value) },
  { label: "Al menos un número", test: (value: string) => /\d/.test(value) },
];

const registerSchema = loginSchema.extend({
  fullName: z.string().min(1, "El nombre es obligatorio"),
  password: z
    .string()
    .refine(
      (value) => PASSWORD_REQUIREMENTS.every((requirement) => requirement.test(value)),
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

export function EmailPasswordForm({ mode, redirectTo }: { mode: Mode; redirectTo?: string }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    setSuccessMessage(null);
    setFieldErrors({});

    const schema = mode === "register" ? registerSchema : loginSchema;
    const result = schema.safeParse(
      mode === "register" ? { email, password, fullName } : { email, password },
    );

    if (!result.success) {
      const errors: Record<string, string> = {};
      for (const issue of result.error.issues) {
        errors[String(issue.path[0])] = issue.message;
      }
      setFieldErrors(errors);
      return;
    }

    setIsLoading(true);
    try {
      if (mode === "register") {
        const { needsEmailConfirmation } = await signUpWithEmail(email, password, fullName, redirectTo);
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

      <TextField
        id="password-input"
        label="Contraseña"
        type={showPassword ? "text" : "password"}
        autoComplete={mode === "register" ? "new-password" : "current-password"}
        aria-describedby={mode === "register" ? "password-requirements" : undefined}
        value={password}
        onChange={(event) => setPassword(event.target.value)}
        error={fieldErrors.password}
        trailing={
          <button
            id="password-visibility-toggle"
            type="button"
            onClick={() => setShowPassword((current) => !current)}
            aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
            aria-pressed={showPassword}
            className="flex h-10 w-10 items-center justify-center rounded-control text-texto-suave transition-colors duration-200 hover:text-texto focus-visible:outline-2 focus-visible:outline-acento"
          >
            {showPassword ? (
              <EyeOff className="h-5 w-5" strokeWidth={1.6} aria-hidden="true" />
            ) : (
              <Eye className="h-5 w-5" strokeWidth={1.6} aria-hidden="true" />
            )}
          </button>
        }
      />

      {mode === "register" && (
        <ul id="password-requirements" aria-label="Requisitos de la contraseña" className="-mt-2 flex flex-col gap-1">
          {PASSWORD_REQUIREMENTS.map((requirement) => {
            const met = requirement.test(password);
            return (
              <li
                key={requirement.label}
                className={`flex items-center gap-2 text-pequeno transition-colors duration-200 ${
                  met ? "text-exito" : "text-texto-suave"
                }`}
              >
                {met ? (
                  <Check className="h-4 w-4 shrink-0" strokeWidth={2} aria-hidden="true" />
                ) : (
                  <Minus className="h-4 w-4 shrink-0" strokeWidth={2} aria-hidden="true" />
                )}
                {requirement.label}
                <span className="sr-only">{met ? "(cumplido)" : "(pendiente)"}</span>
              </li>
            );
          })}
        </ul>
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
