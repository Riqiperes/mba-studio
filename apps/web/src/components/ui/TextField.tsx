import { useId } from "react";
import type { InputHTMLAttributes, Ref } from "react";

interface TextFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  hint?: string | undefined;
  error?: string | undefined;
  ref?: Ref<HTMLInputElement>;
}

/**
 * Campo de texto con etiqueta visible, ayuda opcional y error anunciado.
 * El placeholder nunca sustituye a la etiqueta.
 */
export function TextField({ label, hint, error, id, className = "", ref, ...rest }: TextFieldProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const hintId = hint ? `${inputId}-hint` : undefined;
  const errorId = error ? `${inputId}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(" ") || undefined;

  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      <label htmlFor={inputId} className="text-pequeno font-medium text-texto">
        {label}
      </label>
      <input
        ref={ref}
        id={inputId}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        className={`min-h-12 w-full rounded-control border bg-tarjeta px-4 text-base text-texto transition-[border-color,box-shadow] duration-200 placeholder:text-texto-suave/70 focus:outline-none focus-visible:outline-none focus:ring-4 disabled:cursor-not-allowed disabled:bg-suave disabled:text-texto-suave ${
          error
            ? "border-alerta focus:ring-alerta/15"
            : "border-borde-control hover:border-texto-suave focus:border-acento focus:ring-acento/15"
        }`}
        {...rest}
      />
      {hint && !error && (
        <p id={hintId} className="text-pequeno text-texto-suave">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} className="flex items-start gap-1.5 text-pequeno text-alerta">
          <svg className="mt-0.5 h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
            <circle cx="12" cy="12" r="9" />
            <path d="M12 8v4.5M12 16h.01" />
          </svg>
          {error}
        </p>
      )}
    </div>
  );
}
