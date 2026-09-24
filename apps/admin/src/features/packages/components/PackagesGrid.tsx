import type { Package } from "../types/Package";

type Props = {
  packages: Package[];
  onEdit: (pkg: Package) => void;
  onToggleActive: (pkg: Package) => void;
  onDelete: (pkg: Package) => void;
};

const priceFormatter = new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" });

export function PackagesGrid({ packages, onEdit, onToggleActive, onDelete }: Props) {
  if (packages.length === 0) {
    return <p className="vacio">Todavía no hay paquetes.</p>;
  }

  return (
    <div id="packages-grid" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {packages.map((pkg) => (
        <article
          key={pkg.id}
          id={`admin-package-card-${pkg.id}`}
          className="relative flex flex-col rounded-card border border-borde bg-tarjeta p-6 shadow-card transition-colors duration-200 hover:border-acento/40"
        >
          <div className="mb-4 flex flex-col gap-1">
            <h3 className="font-display text-subtitulo font-medium text-texto">
              {/* Toda la tarjeta abre la edicion (como antes); ahora tambien con teclado */}
              <button
                type="button"
                onClick={() => onEdit(pkg)}
                aria-label={`Editar paquete ${pkg.name}`}
                className="text-start after:absolute after:inset-0 after:rounded-card after:content-['']"
              >
                {pkg.name}
              </button>
            </h3>
            {pkg.description && <p className="text-sm text-texto-suave">{pkg.description}</p>}
          </div>

          <div className="mb-4 flex items-center gap-2 text-sm text-texto">
            <span className="font-medium">{pkg.credits} créditos</span>
            <span className="text-texto-suave">·</span>
            <span>{pkg.validDays ? `${pkg.validDays} días` : "Sin vencimiento"}</span>
          </div>

          <div className="mt-auto flex items-end justify-between border-t border-borde pt-4">
            <div>
              <p className="font-display text-precio font-medium tabular-nums text-texto">
                {priceFormatter.format(pkg.priceCents / 100)}
              </p>
              <p className="text-pequeno text-texto-suave">Pago único</p>
            </div>
            <div className="relative z-10 flex flex-col items-end gap-1">
              <span
                className={
                  pkg.active
                    ? "rounded-full bg-suave px-2 py-0.5 text-pequeno text-exito"
                    : "rounded-full bg-suave px-2 py-0.5 text-pequeno text-texto-suave"
                }
              >
                {pkg.active ? "Activo" : "Inactivo"}
              </span>
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  onToggleActive(pkg);
                }}
                className="accion text-texto-suave"
              >
                {pkg.active ? "Desactivar" : "Activar"}
              </button>
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  onDelete(pkg);
                }}
                className="accion text-alerta"
              >
                Eliminar
              </button>
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}
