interface LoadingSpinnerProps {
  className?: string;
}

/** Indicador giratorio decorativo; el texto de carga lo pone quien lo usa. */
export function LoadingSpinner({ className = "h-5 w-5" }: LoadingSpinnerProps) {
  return (
    <svg className={`animate-spin ${className}`} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="9.5" stroke="currentColor" strokeOpacity="0.2" strokeWidth="2.5" />
      <path d="M21.5 12A9.5 9.5 0 0 0 12 2.5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}
