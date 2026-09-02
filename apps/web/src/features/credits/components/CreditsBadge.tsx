// apps/web/src/features/credits/components/CreditsBadge.tsx
type Props = {
  balance: number | null;
  loading?: boolean;
  compact?: boolean;
};

export function CreditsBadge({ balance, loading, compact = false }: Props) {
  if (loading) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-3 py-1 text-sm font-medium text-gray-500">
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-gray-300" />
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-gray-300" />
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-gray-300" />
      </span>
    );
  }

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full bg-brand-primary/10 px-3 py-1 text-sm font-medium text-brand-primary ${compact ? "" : "text-base px-4 py-1.5"}`}>
      <span aria-hidden="true">💎</span>
      <span>{balance ?? 0}</span>
    </span>
  );
}