// apps/web/src/features/credits/components/CreditsBadge.tsx
import { Ticket } from "lucide-react";

type Props = {
  balance: number | null;
  loading?: boolean | undefined;
  compact?: boolean | undefined;
};

/**
 * Creditos disponibles. Normal: numero serif grande con etiqueta (PROMPT.md);
 * compact: pastilla pequena con icono.
 */
export function CreditsBadge({ balance, loading, compact = false }: Props) {
  const value = balance ?? 0;
  const label = value === 1 ? "crédito disponible" : "créditos disponibles";

  if (loading) {
    return (
      <span role="status" className="inline-flex items-center gap-1 rounded-full bg-suave px-3 py-2">
        <span className="sr-only">Cargando créditos…</span>
        <span aria-hidden="true" className="h-1.5 w-1.5 animate-pulse rounded-full bg-malva" />
        <span aria-hidden="true" className="h-1.5 w-1.5 animate-pulse rounded-full bg-malva" />
        <span aria-hidden="true" className="h-1.5 w-1.5 animate-pulse rounded-full bg-malva" />
      </span>
    );
  }

  if (compact) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-acento-suave px-3 py-1 text-pequeno font-medium text-acento">
        <Ticket className="h-4 w-4" strokeWidth={1.6} aria-hidden="true" />
        <span className="tabular-nums">{value}</span>
        <span className="sr-only">{label}</span>
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-3 rounded-card bg-acento-suave px-4 py-2.5 text-acento">
      <Ticket className="h-5 w-5" strokeWidth={1.6} aria-hidden="true" />
      <span className="flex flex-col leading-none">
        <span className="font-display text-titulo font-medium tabular-nums">{value}</span>
        <span className="mt-1 text-pequeno">{label}</span>
      </span>
    </span>
  );
}
