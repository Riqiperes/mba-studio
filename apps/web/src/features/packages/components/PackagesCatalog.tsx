import { usePackages } from "@/features/packages/hooks/usePackages";
import { PackageCard } from "@/features/packages/components/PackageCard";
import { BackButton } from "@/components/ui/BackButton";
import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { LoadingState } from "@/components/ui/LoadingState";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";

export function PackagesCatalogPage() {
  const { packages, loading, error } = usePackages();

  return (
    <div id="packages-catalog-page" className="mx-auto max-w-[980px] px-4 py-6 sm:px-8 sm:py-8">
      <BackButton />
      <ScreenHeader
        eyebrow="Estudio de Pilates"
        title="Nuestros paquetes"
        lead="Elige el paquete que mejor se adapte a tu práctica. Todos los precios en MXN."
      />

      {error && (
        <div className="mb-6">
          <ErrorState id="packages-error" message={error} />
        </div>
      )}

      {loading ? (
        <LoadingState id="packages-loading" message="Cargando paquetes…" />
      ) : packages.length === 0 ? (
        !error && (
          <EmptyState
            id="packages-empty"
            title="Todavía no hay paquetes disponibles"
            description="Vuelve pronto para ver las opciones del estudio."
          />
        )
      ) : (
        <div id="packages-grid" className="grid gap-4 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3">
          {packages.map((pkg) => (
            <PackageCard key={pkg.id} pkg={pkg} />
          ))}
        </div>
      )}
    </div>
  );
}
