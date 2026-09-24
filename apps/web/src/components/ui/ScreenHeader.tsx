import type { ReactNode } from "react";

interface ScreenHeaderProps {
  title: string;
  /** Etiqueta editorial encima del titulo (mayusculas espaciadas). */
  eyebrow?: string | undefined;
  /** Entradilla bajo el titulo. */
  lead?: ReactNode | undefined;
  id?: string | undefined;
}

/** Encabezado de pantalla de PROMPT.md: etiqueta, titulo serif y entradilla. */
export function ScreenHeader({ title, eyebrow, lead, id }: ScreenHeaderProps) {
  return (
    <header id={id} className="mb-8 space-y-3">
      {eyebrow && <p className="etiqueta">{eyebrow}</p>}
      <h1 className="font-display text-titulo font-medium text-texto sm:text-display-l">{title}</h1>
      {lead && <p className="max-w-xl text-cuerpo-l text-texto-suave text-pretty">{lead}</p>}
    </header>
  );
}
