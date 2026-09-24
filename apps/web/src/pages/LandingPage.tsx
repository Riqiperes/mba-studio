import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowUpRight, CalendarDays, MapPin, MessageCircle, Phone, Ticket } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { getBusiness } from "@/features/studio/services/businessService";
import type { Business } from "@/features/studio/services/businessService";
import { LoadingState } from "@/components/ui/LoadingState";
import { buttonClasses } from "@/components/ui/buttonStyles";

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

function formatMapEmbedUrl(address: string): string {
  return `https://maps.google.com/maps?q=${encodeURIComponent(address)}&output=embed`;
}

function formatDirectionsUrl(address: string): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}`;
}

const QUICK_ACCESS_ITEMS: { to: string; title: string; description: string; Icon: LucideIcon }[] = [
  { to: "/packages", title: "Paquetes", description: "Opciones y precios", Icon: Ticket },
  { to: "/classes", title: "Horarios", description: "Clases disponibles", Icon: CalendarDays },
];

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
    return <LoadingState id="landing-loading" />;
  }

  const businessName = business?.name ?? "MBA MID";
  const whatsappUrl = business?.whatsappNumber ? formatWhatsAppLink(business.whatsappNumber) : "";
  const phoneUrl = business?.phone ? formatPhoneLink(business.phone) : "";
  const address = business?.address ?? null;
  const hasContactInfo = Boolean(address || phoneUrl || whatsappUrl);

  return (
    <div id="landing-page" className="mx-auto flex max-w-[980px] flex-col gap-10 px-4 pt-6 sm:gap-12 sm:px-8 sm:pt-8">
      {/* 1. Banner con la bailarina difuminada */}
      <section
        id="landing-hero-section"
        className="tema-claro relative isolate flex min-h-[420px] overflow-hidden rounded-card border border-borde bg-cloud shadow-card sm:min-h-[340px]"
      >
        <img
          src="/brand/bailarina-difuminada.jpg"
          alt=""
          className="absolute inset-y-0 right-0 -z-10 h-full w-full object-cover object-[50%_28%] sm:w-[62%]"
        />
        {/* Velo: de abajo hacia arriba en movil, de izquierda a derecha en escritorio */}
        <div
          aria-hidden="true"
          className="absolute inset-0 -z-10 bg-[linear-gradient(0deg,var(--cloud-dancer)_0%,var(--cloud-dancer)_42%,transparent_78%)] sm:bg-[linear-gradient(90deg,var(--cloud-dancer)_0%,var(--cloud-dancer)_38%,transparent_60%)]"
        />
        <img
          src="/brand/corner-motif-rosa.svg"
          alt=""
          aria-hidden="true"
          className="absolute top-0 right-0 w-14 opacity-70 sm:w-20"
        />
        <div className="mt-auto flex max-w-md flex-col items-start gap-4 p-6 sm:my-auto sm:p-10">
          <p className="etiqueta text-cacao">Pilates · Ballet</p>
          <h1 className="font-display text-titulo font-medium text-texto sm:text-[2.75rem] sm:leading-[1.1]">
            La danza es armonía y ritmo
          </h1>
          <p className="text-cuerpo-l text-texto-suave text-pretty">
            {business?.description ?? `Reserva tu próxima clase en ${businessName}.`}
          </p>
          <Link id="landing-hero-cta" to="/classes" className={buttonClasses("primary", "md")}>
            Ver horarios
          </Link>
        </div>
      </section>

      {/* 2. Accesos rapidos */}
      <section id="landing-quick-access-section" aria-labelledby="landing-quick-access-title" className="space-y-4">
        <h2 id="landing-quick-access-title" className="font-display text-subtitulo font-medium">
          Accesos rápidos
        </h2>
        <div className="grid grid-cols-2 gap-3 sm:gap-4">
          {QUICK_ACCESS_ITEMS.map(({ to, title, description, Icon }) => (
            <Link
              key={to}
              to={to}
              className="group relative flex flex-col gap-4 rounded-card border border-borde bg-tarjeta p-5 shadow-card transition-[translate,box-shadow] duration-200 ease-(--ease-brand) hover:-translate-y-0.5 active:scale-[0.98] sm:p-6"
            >
              <span className="grid h-11 w-11 place-items-center rounded-full bg-acento-suave text-acento">
                <Icon className="h-5 w-5" strokeWidth={1.6} aria-hidden="true" />
              </span>
              <ArrowUpRight
                className="absolute top-5 right-5 h-5 w-5 text-texto-suave transition-[translate,color] duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-acento"
                strokeWidth={1.6}
                aria-hidden="true"
              />
              <span className="space-y-0.5">
                <span className="block text-subtitulo font-medium text-texto">{title}</span>
                <span className="block text-pequeno text-texto-suave">{description}</span>
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* 3. Donde estamos: mapa, direccion y contacto. Siempre visible; sin
          datos del negocio muestra el lugar reservado del mapa como antes. */}
      <section
          id="landing-location-section"
          aria-labelledby="landing-location-title"
          className="grid overflow-hidden rounded-card border border-borde bg-tarjeta shadow-card sm:grid-cols-2"
        >
          {address ? (
            <iframe
              id="landing-map"
              title={`Mapa: ${address}`}
              src={formatMapEmbedUrl(address)}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              className="h-56 w-full border-0 sm:h-full sm:min-h-72"
            />
          ) : (
            <div
              id="landing-map-placeholder"
              className="flex h-48 flex-col items-center justify-center gap-2 bg-suave text-texto-suave sm:h-full sm:min-h-72"
            >
              <MapPin className="h-8 w-8 text-malva" strokeWidth={1.4} aria-hidden="true" />
              <span className="text-pequeno">Mapa de Google</span>
            </div>
          )}
          <div className="flex flex-col gap-5 p-6 sm:p-8">
            <div className="space-y-2">
              <p className="etiqueta">Visítanos</p>
              <h2 id="landing-location-title" className="font-display text-titulo font-medium">
                Dónde estamos
              </h2>
            </div>
            {address && (
              <address className="flex items-start gap-3 text-cuerpo-l not-italic text-texto">
                <MapPin className="mt-1 h-5 w-5 shrink-0 text-acento" strokeWidth={1.6} aria-hidden="true" />
                {address}
              </address>
            )}
            {!hasContactInfo && (
              <p className="text-cuerpo text-texto-suave">Aquí irán la dirección y los datos de contacto.</p>
            )}
            <div className="mt-auto flex flex-wrap gap-3">
              {whatsappUrl && (
                <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" className={buttonClasses("primary", "md")}>
                  <MessageCircle className="h-[18px] w-[18px]" strokeWidth={1.6} aria-hidden="true" />
                  WhatsApp
                </a>
              )}
              {phoneUrl && (
                <a href={phoneUrl} className={buttonClasses("secondary", "md")}>
                  <Phone className="h-[18px] w-[18px]" strokeWidth={1.6} aria-hidden="true" />
                  Llamar
                </a>
              )}
              {address && (
                <a
                  href={formatDirectionsUrl(address)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={buttonClasses("soft", "md")}
                >
                  Cómo llegar
                </a>
              )}
            </div>
          </div>
        </section>

      <footer className="border-t border-borde pt-6 pb-2 text-center text-pequeno text-texto-suave">
        <p>
          {businessName} &copy; {new Date().getFullYear()}
        </p>
      </footer>
    </div>
  );
}
