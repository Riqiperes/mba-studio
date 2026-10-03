import { useState, type FormEvent } from "react";
import { z } from "zod";
import { CircleAlert, CircleCheck } from "lucide-react";
import { requestPasswordReset } from "../services/authService";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/TextField";

const emailSchema = z.string().email("Correo inválido");

/** Pide el correo y manda el enlace para crear una contrasena nueva. */
export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState<string | undefined>();
  const [formError, setFormError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    const result = emailSchema.safeParse(email.trim());
    if (!result.success) {
      setEmailError(result.error.issues[0]?.message);
      return;
    }
    setEmailError(undefined);
    setIsLoading(true);
    try {
      await requestPasswordReset(result.data);
      setSent(true);
    } catch (err) {
      setFormError("No se pudo enviar el correo. Intenta de nuevo en un minuto.");
      console.error("[auth] requestPasswordReset fallo", err);
    } finally {
      setIsLoading(false);
    }
  }

  if (sent) {
    // Mismo mensaje exista o no la cuenta, para no revelar que correos estan registrados.
    return (
      <p role="status" className="flex items-start gap-2 rounded-control bg-suave p-3 text-pequeno text-exito">
        <CircleCheck className="mt-px h-4 w-4 shrink-0" strokeWidth={1.8} aria-hidden="true" />
        Si hay una cuenta con ese correo, te enviamos un enlace para crear una contraseña nueva. Revisa tu
        bandeja de entrada y spam.
      </p>
    );
  }

  return (
    <form id="forgot-password-form" onSubmit={handleSubmit} noValidate className="flex w-full flex-col gap-4">
      <TextField
        id="forgot-password-email-input"
        label="Correo electrónico"
        type="email"
        inputMode="email"
        autoComplete="email"
        autoCapitalize="none"
        placeholder="tu@correo.com"
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        error={emailError}
      />
      <Button type="submit" size="lg" loading={isLoading} className="w-full">
        {isLoading ? "Enviando…" : "Enviar enlace"}
      </Button>
      {formError && (
        <p role="alert" className="alerta-entra flex items-start gap-2 text-pequeno text-alerta">
          <CircleAlert className="mt-px h-4 w-4 shrink-0" strokeWidth={1.8} aria-hidden="true" />
          {formError}
        </p>
      )}
    </form>
  );
}
