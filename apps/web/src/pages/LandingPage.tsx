import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getBusiness } from "@/features/studio/services/businessService";
import type { Business } from "@/features/studio/services/businessService";
import { Card, CardContent } from "@/components/ui/Card";

function formatWhatsAppLink(number: string | null): string {
  if (!number) return "";
  const cleaned = number.replace(/\D/g, "");
  return `https://wa.me/52${cleaned}`;
}

function formatPhoneLink(number: string | null): string {
  if (!number) return "";
  const cleaned = number.replace(/\D/g, "");
  return `tel:+52${cleaned}`;
}

export function LandingPage() {
  const [business, setBusiness] = useState<Business | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadBusiness() {
      const data = await getBusiness();
      setBusiness(data);
      setLoading(false);
    }
    loadBusiness();
  }, []);

  if (loading) {
    return (
      <div id="landing-loading" className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-primary mx-auto mb-4"></div>
          <p className="text-gray-500">Cargando...</p>
        </div>
      </div>
    );
  }

  const whatsappUrl = business?.whatsappNumber ? formatWhatsAppLink(business.whatsappNumber) : "";
  const phoneUrl = business?.phone ? formatPhoneLink(business.phone) : "";

  return (
    <div id="landing-page" className="space-y-6 px-4 pt-4 pb-24">
      {business?.logoUrl && (
        <div className="flex justify-center pt-4">
          <img
            src={business.logoUrl}
            alt={business.name}
            className="h-16 w-auto rounded-lg"
          />
        </div>
      )}

      <section className="text-center space-y-3">
        <h1 className="text-2xl font-bold text-gray-900">{business?.name ?? "MBA MID"}</h1>
        {business?.description && (
          <p className="text-gray-600 max-w-md mx-auto">{business.description}</p>
        )}
      </section>

      {business?.address && (
        <section className="rounded-lg bg-white p-4 shadow-sm">
          <h2 className="mb-3 text-lg font-semibold text-gray-900">📍 Ubicación</h2>
          <address className="text-gray-600 not-italic">{business.address}</address>
        </section>
      )}

      <section className="grid gap-3 sm:grid-cols-2">
        {business?.phone && (
          <a
            href={phoneUrl}
            className="flex items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white p-4 shadow-sm"
          >
            <span className="text-xl">📞</span>
            <span className="font-medium text-gray-700">Llamar</span>
          </a>
        )}
        {whatsappUrl && (
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white p-4 shadow-sm"
          >
            <span className="text-xl">💬</span>
            <span className="font-medium text-gray-700">WhatsApp</span>
          </a>
        )}
      </section>

      <section className="space-y-3 pt-2">
        <h2 className="text-lg font-semibold text-gray-900">Accesos rápidos</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <Link to="/packages">
            <Card className="h-full">
              <CardContent className="flex flex-col items-center text-center p-6">
                <span className="mb-3 text-4xl">📦</span>
                <h3 className="text-lg font-semibold text-brand-primary">Paquetes</h3>
                <p className="mt-1 text-sm text-gray-500">Ver opciones y precios</p>
              </CardContent>
            </Card>
          </Link>
          <Link to="/classes">
            <Card className="h-full">
              <CardContent className="flex flex-col items-center text-center p-6">
                <span className="mb-3 text-4xl">📅</span>
                <h3 className="text-lg font-semibold text-brand-primary">Horarios</h3>
                <p className="mt-1 text-sm text-gray-500">Clases disponibles</p>
              </CardContent>
            </Card>
          </Link>
        </div>
      </section>

      <footer className="pt-8 border-t border-gray-200 text-center text-sm text-gray-500">
        <p>{business?.name ?? "MBA MID"} &copy; {new Date().getFullYear()}</p>
      </footer>
    </div>
  );
}