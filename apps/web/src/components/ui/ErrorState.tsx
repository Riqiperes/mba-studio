import { Button } from "@/components/ui/Button";

interface ErrorStateProps {
  /** Que salio mal, en lenguaje del usuario. */
  message: string;
  /** Si existe, se muestra "Reintentar" para recuperarse. */
  onRetry?: () => void;
  id?: string;
}

export function ErrorState({ message, onRetry, id }: ErrorStateProps) {
  return (
    <div id={id} role="alert" className="flex flex-col items-center gap-3 rounded-card border border-red-200 bg-red-50 px-6 py-8 text-center">
      <svg className="h-8 w-8 text-red-700" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" aria-hidden="true">
        <circle cx="12" cy="12" r="9" />
        <path d="M12 8v4.5M12 16h.01" />
      </svg>
      <p className="max-w-xs text-sm text-red-800 text-pretty">{message}</p>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry}>
          Reintentar
        </Button>
      )}
    </div>
  );
}
