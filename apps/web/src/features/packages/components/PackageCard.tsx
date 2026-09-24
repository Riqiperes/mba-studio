import { Link } from "react-router-dom";
import type { PackageCatalogItem } from "../types/Package";
import { buttonClasses } from "@/components/ui/buttonStyles";
import { formatCreditsLabel, formatValidityChip } from "../utils/packageDisplayLabels";

export function PackageCard({ pkg }: { pkg: PackageCatalogItem }) {
  return (
    <Link
      to={`/packages/${pkg.id}`}
      className="group block rounded-card transition-[translate] duration-200 ease-(--ease-brand) hover:-translate-y-0.5 active:scale-[0.99]"
    >
      <article
        id={`package-card-${pkg.id}`}
        className="flex h-full flex-col rounded-card border border-borde bg-tarjeta p-6 shadow-card"
      >
        <div className="flex flex-col gap-1.5">
          <h2 className="text-subtitulo font-medium text-texto">{pkg.name}</h2>
          {pkg.description && <p className="text-[0.875rem] leading-5 text-texto-suave text-pretty">{pkg.description}</p>}
        </div>

        <ul className="mt-4 mb-6 flex flex-wrap gap-2" aria-label="Detalles del paquete">
          <li className="rounded-chip bg-suave px-2.5 py-1 text-pequeno font-medium text-texto">
            {formatCreditsLabel(pkg.credits)}
          </li>
          <li className="rounded-chip bg-suave px-2.5 py-1 text-pequeno text-texto">{formatValidityChip(pkg)}</li>
        </ul>

        <div className="mt-auto border-t border-borde pt-5">
          <p className="font-display text-precio font-medium tabular-nums text-texto">{pkg.priceFormatted}</p>
          <p className="text-pequeno text-texto-suave">MXN · pago único</p>
          {/* Visualmente un boton; toda la tarjeta ya es el enlace */}
          <span className={`${buttonClasses("secondary", "md")} mt-5 w-full group-hover:bg-acento-suave`}>
            Elegir paquete
          </span>
        </div>
      </article>
    </Link>
  );
}
