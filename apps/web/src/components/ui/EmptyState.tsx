import type { ReactNode } from "react";
import { BrandLogo } from "@/components/ui/BrandLogo";

interface EmptyStateProps {
  title: string;
  description?: string;
  /** Accion para salir del vacio, por ejemplo un Button o un Link. */
  action?: ReactNode;
  id?: string;
}

export function EmptyState({ title, description, action, id }: EmptyStateProps) {
  return (
    <div id={id} className="flex flex-col items-center gap-3 rounded-card bg-surface-brand/60 px-6 py-10 text-center">
      <BrandLogo variant="monogram" alt="" className="h-9 opacity-90" />
      <div className="space-y-1">
        <p className="font-medium text-ink">{title}</p>
        {description && <p className="max-w-xs text-sm text-ink-muted text-pretty">{description}</p>}
      </div>
      {action && <div className="pt-1">{action}</div>}
    </div>
  );
}
