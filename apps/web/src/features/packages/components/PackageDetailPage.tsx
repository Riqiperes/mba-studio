import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { CalendarClock, CreditCard, MessageCircle, Ticket, Wallet } from "lucide-react";
import { listActivePackages } from "@/features/packages/services/packagesService";
import type { PackageCatalogItem } from "@/features/packages/types/Package";
import { Button } from "@/components/ui/Button";
import { BackButton } from "@/components/ui/BackButton";
import { LoadingState } from "@/components/ui/LoadingState";
import { EmptyState } from "@/components/ui/EmptyState";
import { buttonClasses } from "@/components/ui/buttonStyles";
import { formatCreditsLabel } from "@/features/packages/utils/packageDisplayLabels";

// Numero de WhatsApp para informes y clases (lada de Mexico 52).
const WHATSAPP_CONTACT_NUMBER = "529991072423";

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
    window.open(`https://wa.me/${WHATSAPP_CONTACT_NUMBER}?text=${message}`, "_blank");
  };

  if (loading) {
    return <LoadingState id="package-detail-loading" message="Cargando paquete…" />;
  }

  if (error || !pkg) {
    return (
      <div id="package-detail-not-found" className="mx-auto max-w-md px-4 py-6 sm:py-8">
        <BackButton to="/packages" label="Paquetes" />
        <EmptyState
          title="No encontramos este paquete"
          description={error ?? "El paquete no existe o ya no está disponible."}
          action={
            <Link to="/packages" className={buttonClasses("secondary", "md")}>
              Ver todos los paquetes
            </Link>
          }
        />
      </div>
    );
  }

  const details = [
    { label: "Créditos", value: formatCreditsLabel(pkg.credits), Icon: Ticket },
    { label: "Vigencia", value: pkg.validityLabel, Icon: CalendarClock },
    { label: "Pago", value: "Pago único", Icon: Wallet },
  ];

  return (
    <div id="package-detail-page" className="mx-auto max-w-[980px] px-4 py-6 sm:px-8 sm:py-8">
      <BackButton to="/packages" label="Paquetes" />

      <div className="grid gap-6 lg:grid-cols-[1fr_360px] lg:items-start">
        <section id="package-detail-info" className="space-y-6">
          <header className="space-y-3">
            <p className="etiqueta">Paquete</p>
            <h1 className="font-display text-titulo font-medium sm:text-display-l">{pkg.name}</h1>
            <p className="max-w-xl text-cuerpo-l text-texto-suave text-pretty">{pkg.description ?? "Sin descripción"}</p>
          </header>

          <dl className="grid grid-cols-3 gap-2 sm:gap-3">
            {details.map(({ label, value, Icon }) => (
              <div key={label} className="flex flex-col items-center gap-2 rounded-card border border-borde bg-tarjeta p-3 text-center shadow-card sm:flex-row sm:gap-3 sm:p-4 sm:text-start">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-acento-suave text-acento">
                  <Icon className="h-5 w-5" strokeWidth={1.6} aria-hidden="true" />
                </span>
                <div>
                  <dt className="text-pequeno text-texto-suave">{label}</dt>
                  <dd className="font-medium text-texto">{value}</dd>
                </div>
              </div>
            ))}
          </dl>
        </section>

        <aside
          id="package-detail-purchase"
          aria-label="Precio y compra"
          className="rounded-card border border-borde bg-tarjeta p-6 shadow-card lg:sticky lg:top-[100px]"
        >
          <p className="etiqueta">Precio</p>
          <p className="mt-2 font-display text-precio font-medium tabular-nums">{pkg.priceFormatted}</p>
          <p className="text-pequeno text-texto-suave">MXN · pago único</p>

          <div className="mt-6 space-y-3 border-t border-borde pt-6">
            <Button variant="primary" size="lg" className="w-full" onClick={handleWhatsApp}>
              <MessageCircle className="h-5 w-5" strokeWidth={1.6} aria-hidden="true" />
              Consultar por WhatsApp
            </Button>
            <Button variant="outline" size="lg" className="w-full" disabled>
              <CreditCard className="h-5 w-5" strokeWidth={1.6} aria-hidden="true" />
              Comprar (próximamente)
            </Button>
            <p className="text-center text-pequeno text-texto-suave text-pretty">
              El pago se procesará vía Stripe cuando esté disponible.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
