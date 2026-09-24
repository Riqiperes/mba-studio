import { useId } from "react";
import type { Ref, TextareaHTMLAttributes } from "react";

interface TextAreaFieldProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  hint?: string | undefined;
  error?: string | undefined;
  ref?: Ref<HTMLTextAreaElement>;
}

/** Area de texto con el mismo estilo y comportamiento que TextField. */
export function TextAreaField({ label, hint, error, id, className = "", ref, ...rest }: TextAreaFieldProps) {
  const generatedId = useId();
  const fieldId = id ?? generatedId;
  const hintId = hint ? `${fieldId}-hint` : undefined;
  const errorId = error ? `${fieldId}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(" ") || undefined;

  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      <label htmlFor={fieldId} className="text-pequeno font-medium text-texto">
        {label}
      </label>
      <textarea
        ref={ref}
        id={fieldId}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        className={`w-full rounded-control border bg-tarjeta px-4 py-3 text-base text-texto transition-[border-color,box-shadow] duration-200 placeholder:text-texto-suave focus:outline-none focus-visible:outline-none focus:ring-2 ${
          error
            ? "border-alerta focus:ring-alerta"
            : "border-borde-control hover:border-texto-suave focus:border-acento focus:ring-acento"
        }`}
        {...rest}
      />
      {hint && !error && (
        <p id={hintId} className="text-pequeno text-texto-suave">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} className="text-pequeno text-alerta">
          {error}
        </p>
      )}
    </div>
  );
}
