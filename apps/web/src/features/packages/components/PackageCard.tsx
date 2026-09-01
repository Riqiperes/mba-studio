import type { PackageCatalogItem } from "../types/Package";

export function PackageCard({ pkg }: { pkg: PackageCatalogItem }) {
  return (
    <article id={`package-card-${pkg.id}`} className="flex flex-col h-full rounded-lg border border-gray-200 bg-white p-6 shadow-sm hover:shadow-md transition-shadow">
      <div className="mb-4 flex flex-col gap-1">
        <h3 className="text-lg font-semibold text-brand-primary">{pkg.name}</h3>
        {pkg.description && <p className="text-sm text-gray-600">{pkg.description}</p>}
      </div>

      <div className="mb-4 flex flex-col gap-2 text-sm">
        <div className="flex items-center gap-2 text-gray-700">
          <span className="font-medium">{pkg.credits} créditos</span>
          <span className="text-gray-400">·</span>
          <span>{pkg.validityLabel}</span>
        </div>
      </div>

      <div className="mt-auto pt-4 border-t border-gray-100">
        <p className="text-2xl font-bold text-brand-primary">{pkg.priceFormatted}</p>
        <p className="text-xs text-gray-500">Pago único</p>
      </div>
    </article>
  );
}