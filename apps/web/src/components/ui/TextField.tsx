import { useId } from "react";
import type { InputHTMLAttributes, Ref } from "react";

interface TextFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  hint?: string;
  error?: string;
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
      <label htmlFor={inputId} className="text-sm font-medium text-ink">
        {label}
      </label>
      <input
        ref={ref}
        id={inputId}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        className={`min-h-12 w-full rounded-control border bg-surface px-4 text-base text-ink transition-[border-color,box-shadow] duration-150 placeholder:text-gray-400 focus:outline-none focus-visible:outline-none focus:ring-4 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-ink-muted ${
          error
            ? "border-red-600 focus:ring-red-600/15"
            : "border-line hover:border-gray-400 focus:border-accent focus:ring-accent/15"
        }`}
        {...rest}
      />
      {hint && !error && (
        <p id={hintId} className="text-sm text-ink-muted">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} className="flex items-start gap-1.5 text-sm text-red-700">
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
