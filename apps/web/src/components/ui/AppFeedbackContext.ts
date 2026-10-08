import { createContext, useContext } from "react";

export type ToastTone = "success" | "error" | "info";

export interface ConfirmOptions {
  title: string;
  description?: string | undefined;
  confirmLabel?: string | undefined;
  cancelLabel?: string | undefined;
  /** "danger" pinta el boton de confirmar con el color de alerta. */
  tone?: "default" | "danger" | undefined;
}

export interface AppFeedback {
  /** Toast breve arriba de la pantalla; se cierra solo. */
  notify: (message: string, tone?: ToastTone) => void;
  /** Modal de confirmacion; resuelve true solo si la persona confirma. */
  confirm: (options: ConfirmOptions) => Promise<boolean>;
}

export const AppFeedbackContext = createContext<AppFeedback | null>(null);

/** Toasts y confirmaciones de toda la app (montados en AppFeedbackProvider). */
export function useAppFeedback(): AppFeedback {
  const feedback = useContext(AppFeedbackContext);
  if (!feedback) throw new Error("useAppFeedback debe usarse dentro de AppFeedbackProvider");
  return feedback;
}
