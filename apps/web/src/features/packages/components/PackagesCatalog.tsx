import { usePackages } from "@/features/packages/hooks/usePackages";
import { PackageCard } from "@/features/packages/components/PackageCard";

export function PackagesCatalogPage() {
  const { packages, loading, error } = usePackages();

  return (
    <div id="packages-catalog-page" className="mx-auto max-w-5xl p-6">
      <header className="mb-8">
        <h1 className="text-2xl font-semibold text-brand-primary">Nuestros paquetes</h1>
        <p className="mt-1 text-gray-600">
          Elige el paquete que mejor se adapte a tu práctica. Todos los precios en MXN.
        </p>
      </header>

      {error && (
        <div id="packages-error" className="mb-6 rounded-md bg-red-50 p-4 text-sm text-red-600">
          {error}
        </div>
      )}

      {loading ? (
        <div id="packages-loading" className="flex items-center justify-center py-12 text-gray-500">
          Cargando paquetes...
        </div>
      ) : packages.length === 0 ? (
        <div id="packages-empty" className="text-center py-12 text-gray-500">
          <p>Todavía no hay paquetes disponibles.</p>
        </div>
      ) : (
        <div id="packages-grid" className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {packages.map((pkg) => (
            <PackageCard key={pkg.id} pkg={pkg} />
          ))}
        </div>
      )}
    </div>
  );
}