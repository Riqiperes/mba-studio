import { useState, type FormEvent } from "react";
import { z } from "zod";
import { CircleAlert, CircleCheck } from "lucide-react";
import { signInWithEmail, signUpWithEmail } from "../services/authService";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/TextField";

type Mode = "login" | "register";

const loginSchema = z.object({
  email: z.string().email("Correo inválido"),
  password: z.string().min(8, "La contraseña debe tener al menos 8 caracteres"),
});

const registerSchema = loginSchema.extend({
  fullName: z.string().min(1, "El nombre es obligatorio"),
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
        type="password"
        autoComplete={mode === "register" ? "new-password" : "current-password"}
        hint={mode === "register" ? "Mínimo 8 caracteres." : undefined}
        value={password}
        onChange={(event) => setPassword(event.target.value)}
        error={fieldErrors.password}
      />

      <Button type="submit" size="lg" loading={isLoading} className="mt-2 w-full">
        {isLoading ? "Enviando…" : mode === "register" ? "Crear cuenta" : "Iniciar sesión"}
      </Button>

      {formError && (
        <p role="alert" className="flex items-start gap-2 text-pequeno text-alerta">
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
