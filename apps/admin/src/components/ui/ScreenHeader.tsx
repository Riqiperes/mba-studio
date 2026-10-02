import type { ReactNode } from "react";

interface ScreenHeaderProps {
  title: string;
  /** Etiqueta editorial encima del titulo (mayusculas espaciadas). */
  eyebrow?: string | undefined;
  /** Texto de apoyo bajo el titulo. */
  lead?: ReactNode | undefined;
  /** Botones de la pantalla (por ejemplo "Nueva clase"), a la derecha. */
  actions?: ReactNode | undefined;
  id?: string | undefined;
}

/** Encabezado de pantalla del panel: etiqueta, titulo serif, apoyo y acciones. */
export function ScreenHeader({ title, eyebrow, lead, actions, id }: ScreenHeaderProps) {
  return (
    <header id={id} className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0 space-y-2">
        {eyebrow && <p className="etiqueta">{eyebrow}</p>}
        <h1 className="font-display text-titulo font-medium text-texto">{title}</h1>
        {lead && <div className="max-w-2xl text-cuerpo text-texto-suave text-pretty">{lead}</div>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}
