import type { Package } from "../types/Package";

type Props = {
  packages: Package[];
  onEdit: (pkg: Package) => void;
  onToggleActive: (pkg: Package) => void;
};

const priceFormatter = new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" });

export function PackagesTable({ packages, onEdit, onToggleActive }: Props) {
  if (packages.length === 0) {
    return <p className="text-sm text-gray-500">Todavia no hay paquetes.</p>;
  }

  return (
    <table id="packages-table" className="w-full border-collapse text-sm">
      <thead>
        <tr className="border-b border-gray-200 text-left text-gray-500">
          <th className="py-2">Nombre</th>
          <th className="py-2">Creditos</th>
          <th className="py-2">Precio</th>
          <th className="py-2">Vigencia</th>
          <th className="py-2">Estado</th>
          <th className="py-2">Acciones</th>
        </tr>
      </thead>
      <tbody>
        {packages.map((pkg) => (
          <tr
            key={pkg.id}
            onClick={() => onEdit(pkg)}
            className="cursor-pointer border-b border-gray-100 hover:bg-gray-50"
          >
            <td className="py-2">{pkg.name}</td>
            <td className="py-2">{pkg.credits}</td>
            <td className="py-2">{priceFormatter.format(pkg.priceCents / 100)}</td>
            <td className="py-2">{pkg.validDays ? `${pkg.validDays} dias` : "Sin vencimiento"}</td>
            <td className="py-2">
              <span
                className={
                  pkg.active
                    ? "rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-700"
                    : "rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500"
                }
              >
                {pkg.active ? "Activo" : "Inactivo"}
              </span>
            </td>
            <td className="py-2">
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  onToggleActive(pkg);
                }}
                className="text-gray-600 hover:underline"
              >
                {pkg.active ? "Desactivar" : "Activar"}
              </button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
