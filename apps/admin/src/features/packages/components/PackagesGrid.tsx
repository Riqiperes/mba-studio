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
    return <p className="text-sm text-gray-500">Todavia no hay paquetes.</p>;
  }

  return (
    <div id="packages-grid" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {packages.map((pkg) => (
        <article
          key={pkg.id}
          id={`admin-package-card-${pkg.id}`}
          onClick={() => onEdit(pkg)}
          className="flex cursor-pointer flex-col rounded-lg border border-gray-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-md"
        >
          <div className="mb-4 flex flex-col gap-1">
            <h3 className="text-lg font-semibold text-brand-primary">{pkg.name}</h3>
            {pkg.description && <p className="text-sm text-gray-600">{pkg.description}</p>}
          </div>

          <div className="mb-4 flex items-center gap-2 text-sm text-gray-700">
            <span className="font-medium">{pkg.credits} creditos</span>
            <span className="text-gray-400">·</span>
            <span>{pkg.validDays ? `${pkg.validDays} dias` : "Sin vencimiento"}</span>
          </div>

          <div className="mt-auto flex items-end justify-between border-t border-gray-100 pt-4">
            <div>
              <p className="text-2xl font-bold text-brand-primary">
                {priceFormatter.format(pkg.priceCents / 100)}
              </p>
              <p className="text-xs text-gray-500">Pago unico</p>
            </div>
            <div className="flex flex-col items-end gap-1">
              <span
                className={
                  pkg.active
                    ? "rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-700"
                    : "rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500"
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
                className="text-xs text-gray-600 hover:underline"
              >
                {pkg.active ? "Desactivar" : "Activar"}
              </button>
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  onDelete(pkg);
                }}
                className="text-xs text-red-600 hover:underline"
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
