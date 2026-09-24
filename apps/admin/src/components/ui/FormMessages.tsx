import { CircleAlert } from "lucide-react";

interface FormMessagesProps {
  /** Mensajes de error de la pantalla; los vacios (null/undefined/"") se omiten. */
  messages: (string | null | undefined)[];
}

/** Lista de errores de una pantalla del panel: icono + texto, anunciada. */
export function FormMessages({ messages }: FormMessagesProps) {
  const visible = messages.filter((message): message is string => Boolean(message));
  if (visible.length === 0) return null;
  return (
    <div role="alert" className="mb-4 space-y-2">
      {visible.map((message) => (
        <p key={message} className="flex items-start gap-2 rounded-control bg-suave p-3 text-pequeno text-alerta">
          <CircleAlert className="mt-px h-4 w-4 shrink-0" strokeWidth={1.8} aria-hidden="true" />
          {message}
        </p>
      ))}
    </div>
  );
}
