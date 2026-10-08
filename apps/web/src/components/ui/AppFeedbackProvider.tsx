import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { CircleAlert, CircleCheck, Info, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { ModalDialog } from "@/components/ui/ModalDialog";
import { AppFeedbackContext } from "@/components/ui/AppFeedbackContext";
import type { ConfirmOptions, ToastTone } from "@/components/ui/AppFeedbackContext";

interface Toast {
  id: number;
  message: string;
  tone: ToastTone;
}

interface PendingConfirm {
  options: ConfirmOptions;
  resolve: (confirmed: boolean) => void;
}

const toneIcons = { success: CircleCheck, error: CircleAlert, info: Info } as const;
const toneColors: Record<ToastTone, string> = { success: "text-exito", error: "text-alerta", info: "text-acento" };

/**
 * Toasts + modal de confirmacion para toda la app. Reemplaza window.confirm
 * (que no respeta la marca ni el modo oscuro) y avisa el resultado de cada
 * accion. Se usa con useAppFeedback().
 */
export function AppFeedbackProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [pending, setPending] = useState<PendingConfirm | null>(null);
  const nextId = useRef(0);
  const toastRegionRef = useRef<HTMLDivElement>(null);

  // La region de toasts es un popover para vivir en el top layer: asi se ve
  // encima de un <dialog> modal abierto. Se reabre en cada toast nuevo para
  // quedar por arriba del ultimo modal que se haya abierto.
  useEffect(() => {
    const region = toastRegionRef.current;
    if (!region || typeof region.showPopover !== "function") return;
    if (region.matches(":popover-open")) region.hidePopover();
    if (toasts.length > 0) region.showPopover();
  }, [toasts]);

  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const notify = useCallback(
    (message: string, tone: ToastTone = "success") => {
      nextId.current += 1;
      const id = nextId.current;
      setToasts((current) => [...current, { id, message, tone }]);
      // Los errores se quedan mas tiempo para que alcance a leerse
      window.setTimeout(() => dismiss(id), tone === "error" ? 7000 : 4000);
    },
    [dismiss],
  );

  const confirm = useCallback(
    (options: ConfirmOptions) => new Promise<boolean>((resolve) => setPending({ options, resolve })),
    [],
  );

  function closeConfirm(confirmed: boolean) {
    pending?.resolve(confirmed);
    setPending(null);
  }

  const value = useMemo(() => ({ notify, confirm }), [notify, confirm]);

  return (
    <AppFeedbackContext.Provider value={value}>
      {children}
      <div
        ref={toastRegionRef}
        id="app-toast-region"
        popover="manual"
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 top-4 bottom-auto z-[100] m-0 flex h-auto w-auto flex-col items-center gap-2 overflow-visible border-0 bg-transparent px-4 py-0 [&:not(:popover-open)]:hidden"
      >
        {toasts.map((toast) => {
          const Icon = toneIcons[toast.tone];
          return (
            <div
              key={toast.id}
              role={toast.tone === "error" ? "alert" : "status"}
              className="alerta-entra pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-control border border-borde bg-tarjeta p-3 text-pequeno text-texto shadow-sheet"
            >
              <Icon className={`mt-px h-5 w-5 shrink-0 ${toneColors[toast.tone]}`} strokeWidth={1.8} aria-hidden="true" />
              <p className="flex-1 text-pretty">{toast.message}</p>
              <button
                type="button"
                onClick={() => dismiss(toast.id)}
                aria-label="Cerrar aviso"
                className="-m-1 grid h-7 w-7 shrink-0 place-items-center rounded-full text-texto-suave hover:bg-suave hover:text-texto"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          );
        })}
      </div>
      <ModalDialog
        id="app-confirm-dialog"
        open={pending !== null}
        onClose={() => closeConfirm(false)}
        title={pending?.options.title ?? ""}
        footer={
          <>
            <Button variant="outline" onClick={() => closeConfirm(false)}>
              {pending?.options.cancelLabel ?? "Volver"}
            </Button>
            <Button
              variant={pending?.options.tone === "danger" ? "danger" : "primary"}
              className={pending?.options.tone === "danger" ? "border border-alerta" : ""}
              onClick={() => closeConfirm(true)}
            >
              {pending?.options.confirmLabel ?? "Confirmar"}
            </Button>
          </>
        }
      >
        {pending?.options.description && <p className="text-cuerpo text-texto-suave text-pretty">{pending.options.description}</p>}
      </ModalDialog>
    </AppFeedbackContext.Provider>
  );
}
