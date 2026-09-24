import { useEffect, useId, useRef } from "react";
import type { ReactNode } from "react";

interface ModalDialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string | undefined;
  children: ReactNode;
  /** Botones de accion al pie (por ejemplo cancelar / confirmar). */
  footer?: ReactNode | undefined;
  id?: string | undefined;
}

/**
 * Modal base sobre <dialog> nativo: atrapa el foco, cierra con Escape y
 * devuelve el foco al boton que lo abrio. En movil sale como hoja desde abajo
 * y en escritorio centrado. La animacion vive en index.css (.modal-dialog).
 */
export function ModalDialog({ open, onClose, title, description, children, footer, id }: ModalDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
      // Foco en el dialogo (no en la X) para que el lector anuncie el titulo
      dialog.focus();
    }
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={dialogRef}
      id={id}
      tabIndex={-1}
      aria-labelledby={titleId}
      aria-describedby={description ? descriptionId : undefined}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        // Clic en el fondo (fuera del contenido) cierra el modal
        if (event.target === event.currentTarget) onClose();
      }}
      className="modal-dialog focus-visible:outline-none m-0 mt-auto w-full max-w-none overscroll-contain rounded-t-card bg-tarjeta p-0 text-texto shadow-sheet sm:m-auto sm:max-w-md sm:rounded-card"
    >
      <div className="flex max-h-[85dvh] flex-col">
        <div className="flex items-start justify-between gap-4 px-5 pt-5 sm:px-6 sm:pt-6">
          <div className="space-y-1">
            <h2 id={titleId} className="font-display text-subtitulo font-medium">
              {title}
            </h2>
            {description && (
              <p id={descriptionId} className="text-pequeno text-texto-suave text-pretty">
                {description}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="-me-2 -mt-1 grid h-10 w-10 shrink-0 place-items-center rounded-full text-texto-suave transition-colors duration-200 hover:bg-suave hover:text-texto active:bg-suave"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" aria-hidden="true">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="overflow-y-auto overscroll-contain px-5 py-4 sm:px-6">{children}</div>
        {footer && (
          <div className="flex flex-col-reverse gap-3 border-t border-borde px-5 pt-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:flex-row sm:justify-end sm:px-6 sm:pb-6">
            {footer}
          </div>
        )}
      </div>
    </dialog>
  );
}
