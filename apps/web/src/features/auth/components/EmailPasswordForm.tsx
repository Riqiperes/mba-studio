import { useState, type FormEvent } from "react";
import { z } from "zod";
import { signInWithEmail, signUpWithEmail } from "../services/authService";

type Mode = "login" | "register";

const loginSchema = z.object({
  email: z.string().email("Correo invalido"),
  password: z.string().min(8, "La contrasena debe tener al menos 8 caracteres"),
});

const registerSchema = loginSchema.extend({
  fullName: z.string().min(1, "El nombre es obligatorio"),
});

function mapAuthError(err: unknown): string {
  const message = err instanceof Error ? err.message : "";
  if (message.includes("Invalid login credentials")) {
    return "Correo o contrasena incorrectos.";
  }
  if (message.includes("User already registered")) {
    return "Ya existe una cuenta con ese correo.";
  }
  if (message.includes("Email not confirmed")) {
    return "Todavia no confirmas tu correo. Revisa tu bandeja de entrada.";
  }
  return "Ocurrio un error. Intenta de nuevo.";
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
            "Cuenta creada. Revisa tu correo para confirmarla antes de iniciar sesion.",
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
      className="flex w-full max-w-xs flex-col gap-3"
    >
      {mode === "register" && (
        <div className="flex flex-col gap-1">
          <input
            id="full-name-input"
            type="text"
            placeholder="Nombre completo"
            value={fullName}
            onChange={(event) => setFullName(event.target.value)}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
          {fieldErrors.fullName && <p className="text-xs text-red-600">{fieldErrors.fullName}</p>}
        </div>
      )}

      <div className="flex flex-col gap-1">
        <input
          id="email-input"
          type="email"
          placeholder="Correo electronico"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm"
        />
        {fieldErrors.email && <p className="text-xs text-red-600">{fieldErrors.email}</p>}
      </div>

      <div className="flex flex-col gap-1">
        <input
          id="password-input"
          type="password"
          placeholder="Contrasena"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm"
        />
        {fieldErrors.password && <p className="text-xs text-red-600">{fieldErrors.password}</p>}
      </div>

      <button
        type="submit"
        disabled={isLoading}
        className="rounded-md bg-brand-primary px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
      >
        {isLoading ? "Enviando..." : mode === "register" ? "Crear cuenta" : "Iniciar sesion"}
      </button>

      {formError && <p className="text-sm text-red-600">{formError}</p>}
      {successMessage && <p className="text-sm text-green-600">{successMessage}</p>}
    </form>
  );
}