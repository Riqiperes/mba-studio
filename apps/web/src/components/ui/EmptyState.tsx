import type { ReactNode } from "react";
import { BrandLogo } from "@/components/ui/BrandLogo";

interface EmptyStateProps {
  title: string;
  description?: string | undefined;
  /** Accion para salir del vacio, por ejemplo un Button o un Link. */
  action?: ReactNode | undefined;
  id?: string | undefined;
}

// Estado vacio de PROMPT.md: bloque suave, monograma malva, titulo serif.
export function EmptyState({ title, description, action, id }: EmptyStateProps) {
  return (
    <div id={id} className="flex flex-col items-center gap-4 rounded-card bg-suave px-6 py-12 text-center">
      <BrandLogo variant="monogram" alt="" className="h-[72px] opacity-80" />
      <div className="space-y-1.5">
        <p className="font-display text-subtitulo font-medium text-texto">{title}</p>
        {description && <p className="mx-auto max-w-xs text-cuerpo text-texto-suave text-pretty">{description}</p>}
      </div>
      {action && <div className="pt-1">{action}</div>}
    </div>
  );
}
