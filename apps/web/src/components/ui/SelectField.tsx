import { useId } from "react";
import type { Ref, SelectHTMLAttributes } from "react";

interface SelectFieldProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  hint?: string;
  error?: string;
  ref?: Ref<HTMLSelectElement>;
}

/** Select nativo (teclado y lector de pantalla gratis) con el estilo de TextField. */
export function SelectField({ label, hint, error, id, className = "", children, ref, ...rest }: SelectFieldProps) {
  const generatedId = useId();
  const selectId = id ?? generatedId;
  const hintId = hint ? `${selectId}-hint` : undefined;
  const errorId = error ? `${selectId}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(" ") || undefined;

  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      <label htmlFor={selectId} className="text-pequeno font-medium text-texto">
        {label}
      </label>
      <div className="relative">
        <select
          ref={ref}
          id={selectId}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={`min-h-12 w-full appearance-none rounded-control border bg-tarjeta ps-4 pe-11 text-base text-texto transition-[border-color,box-shadow] duration-200 focus:outline-none focus-visible:outline-none focus:ring-4 disabled:cursor-not-allowed disabled:bg-suave ${
            error
              ? "border-alerta focus:ring-alerta/15"
              : "border-borde-control hover:border-texto-suave focus:border-acento focus:ring-acento/15"
          }`}
          {...rest}
        >
          {children}
        </select>
        <svg className="pointer-events-none absolute end-4 top-1/2 h-4 w-4 -translate-y-1/2 text-texto-suave" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="m6 9 6 6 6-6" />
        </svg>
      </div>
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
