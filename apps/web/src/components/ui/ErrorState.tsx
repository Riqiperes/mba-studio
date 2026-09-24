import { CircleAlert } from "lucide-react";
import { Button } from "@/components/ui/Button";

interface ErrorStateProps {
  /** Que salio mal, en lenguaje del usuario. */
  message: string;
  /** Si existe, se muestra "Reintentar" para recuperarse. */
  onRetry?: (() => void) | undefined;
  id?: string | undefined;
}

// El color de alerta siempre va con icono y texto, nunca solo color.
export function ErrorState({ message, onRetry, id }: ErrorStateProps) {
  return (
    <div id={id} role="alert" className="flex flex-col items-center gap-3 rounded-card border border-alerta/25 bg-tarjeta px-6 py-8 text-center">
      <CircleAlert className="h-7 w-7 text-alerta" strokeWidth={1.6} aria-hidden="true" />
      <p className="max-w-xs text-cuerpo text-texto text-pretty">{message}</p>
      {onRetry && (
        <Button variant="secondary" size="sm" onClick={onRetry}>
          Reintentar
        </Button>
      )}
    </div>
  );
}
