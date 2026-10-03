import { useState } from "react";
import { Check, Eye, EyeOff, Minus } from "lucide-react";
import { TextField } from "@/components/ui/TextField";
import { PASSWORD_REQUIREMENTS } from "../utils/passwordRequirements";

interface PasswordFieldProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  autoComplete: "current-password" | "new-password";
  error?: string | undefined;
  /** Lista en vivo de requisitos (registro y nueva contrasena). */
  showRequirements?: boolean;
}

/** Campo de contrasena con boton mostrar/ocultar y requisitos opcionales. */
export function PasswordField({ id, label, value, onChange, autoComplete, error, showRequirements = false }: PasswordFieldProps) {
  const [visible, setVisible] = useState(false);
  const requirementsId = `${id}-requirements`;

  return (
    <>
      <TextField
        id={id}
        label={label}
        type={visible ? "text" : "password"}
        autoComplete={autoComplete}
        aria-describedby={showRequirements ? requirementsId : undefined}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        error={error}
        trailing={
          <button
            id={`${id}-visibility-toggle`}
            type="button"
            onClick={() => setVisible((current) => !current)}
            aria-label={visible ? "Ocultar contraseña" : "Mostrar contraseña"}
            aria-pressed={visible}
            className="flex h-10 w-10 items-center justify-center rounded-control text-texto-suave transition-colors duration-200 hover:text-texto focus-visible:outline-2 focus-visible:outline-acento"
          >
            {visible ? (
              <EyeOff className="h-5 w-5" strokeWidth={1.6} aria-hidden="true" />
            ) : (
              <Eye className="h-5 w-5" strokeWidth={1.6} aria-hidden="true" />
            )}
          </button>
        }
      />

      {showRequirements && (
        <ul id={requirementsId} aria-label="Requisitos de la contraseña" className="-mt-2 flex flex-col gap-1">
          {PASSWORD_REQUIREMENTS.map((requirement) => {
            const met = requirement.test(value);
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
    </>
  );
}
