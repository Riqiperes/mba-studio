import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { listActivePackages } from "@/features/packages/services/packagesService";
import type { PackageCatalogItem } from "@/features/packages/types/Package";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { BackButton } from "@/components/ui/BackButton";

export function PackageDetailPage() {
  const { id } = useParams<{ id: string }>();
  const packageId = id ?? "";
  const [pkg, setPkg] = useState<PackageCatalogItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadPackage() {
      try {
        const packages = await listActivePackages();
        const found = packages.find((p) => p.id === packageId);
        if (found) {
          setPkg(found);
        } else {
          setError("Paquete no encontrado");
        }
      } catch (err) {
        setError("No se pudo cargar el paquete");
        console.error("[packages] PackageDetail fallo", err);
      } finally {
        setLoading(false);
      }
    }
    loadPackage();
  }, [packageId]);

  const handleWhatsApp = () => {
    if (!pkg) return;
    const message = encodeURIComponent(
      `Hola, me interesa el paquete "${pkg.name}" (${pkg.credits} créditos por ${pkg.priceFormatted}). Quiero más información.`
    );
    window.open(`https://wa.me/?text=${message}`, "_blank");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] px-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-primary mx-auto mb-4"></div>
          <p className="text-gray-500">Cargando...</p>
        </div>
      </div>
    );
  }

  if (error || !pkg) {
    return (
      <div className="mx-auto max-w-md px-4 py-12 text-center">
        <BackButton />
        <h2 className="mb-2 text-xl font-semibold text-gray-900">No encontrado</h2>
        <p className="text-gray-500">{error ?? "El paquete no existe"}</p>
      </div>
    );
  }

  return (
    <div id="package-detail-page" className="mx-auto max-w-md px-4 py-6 space-y-6 pb-24">
      <BackButton />

      <Card>
        <CardContent className="space-y-6 p-6">
          <div className="text-center space-y-3">
            <h1 className="text-2xl font-bold text-brand-primary">{pkg.name}</h1>
            <p className="text-gray-600">{pkg.description ?? "Sin descripción"}</p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="text-center p-4 rounded-lg bg-gray-50">
              <p className="text-3xl font-bold text-brand-primary">{pkg.credits}</p>
              <p className="text-sm text-gray-500">Créditos</p>
            </div>
            <div className="text-center p-4 rounded-lg bg-gray-50">
              <p className="text-3xl font-bold text-brand-primary">{pkg.priceFormatted}</p>
              <p className="text-sm text-gray-500">Pago único</p>
            </div>
            <div className="text-center p-4 rounded-lg bg-gray-50 sm:col-span-2">
              <p className="font-medium text-gray-900">{pkg.validityLabel}</p>
              <p className="text-sm text-gray-500">Vigencia</p>
            </div>
          </div>

          <div className="space-y-3 pt-4 border-t border-gray-200">
            <Button variant="primary" size="lg" className="w-full" onClick={handleWhatsApp}>
              💬 Consultar por WhatsApp
            </Button>
            <Button variant="outline" size="lg" className="w-full" disabled>
              💳 Comprar (próximamente)
            </Button>
            <p className="text-center text-xs text-gray-500">
              El pago se procesará vía Stripe cuando esté disponible.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}