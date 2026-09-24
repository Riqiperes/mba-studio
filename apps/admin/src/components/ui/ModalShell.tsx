import { useEffect, useId, useRef } from "react";
import type { ReactNode } from "react";

interface ModalShellProps {
  onClose: () => void;
  children: ReactNode;
  id?: string | undefined;
  /** Ancho en escritorio: sm (formularios cortos), md o lg (formularios largos). */
  size?: "sm" | "md" | "lg" | undefined;
  /** Clases del cuerpo (por defecto columna con separacion de 12px). */
  bodyClassName?: string | undefined;
}

const SIZE_CLASSES = { sm: "sm:max-w-sm", md: "sm:max-w-md", lg: "sm:max-w-lg" } as const;

/**
 * Contenedor de modal sobre <dialog> nativo para los formularios del panel
 * que ya traen su propio titulo (h2) y botones. Se abre al montarse (el
 * padre lo monta solo cuando esta abierto), atrapa el foco, cierra con
 * Escape o al tocar fuera, y usa el primer h2 como nombre accesible.
 * En movil sale como hoja desde abajo; la animacion vive en index.css.
 */
export function ModalShell({ onClose, children, id, size = "sm", bodyClassName = "flex flex-col gap-3" }: ModalShellProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const fallbackTitleId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const heading = dialog.querySelector("h2");
    if (heading) {
      if (!heading.id) heading.id = fallbackTitleId;
      dialog.setAttribute("aria-labelledby", heading.id);
    }
    if (!dialog.open) {
      dialog.showModal();
      dialog.focus();
    }
  }, [fallbackTitleId]);

  return (
    <dialog
      ref={dialogRef}
      id={id}
      tabIndex={-1}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        // Clic en el fondo (fuera del contenido) cierra el modal, como antes
        if (event.target === event.currentTarget) onClose();
      }}
      className={`modal-dialog m-0 mt-auto w-full max-w-none overscroll-contain rounded-t-card bg-tarjeta p-0 text-texto shadow-sheet focus-visible:outline-none sm:m-auto sm:rounded-card ${SIZE_CLASSES[size]}`}
    >
      <div
        className={`max-h-[88dvh] overflow-y-auto overscroll-contain p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:p-6 ${bodyClassName}`}
      >
        {children}
      </div>
    </dialog>
  );
}
