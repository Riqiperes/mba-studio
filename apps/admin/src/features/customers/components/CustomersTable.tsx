import { Link } from "react-router-dom";
import type { Customer } from "../types/Customer";

type Props = {
  customers: Customer[];
};

export function CustomersTable({ customers }: Props) {
  if (customers.length === 0) {
    return <p className="text-sm text-gray-500">Todavia no hay clientes.</p>;
  }

  return (
    <table id="customers-table" className="w-full border-collapse text-sm">
      <thead>
        <tr className="border-b border-gray-200 text-left text-gray-500">
          <th className="py-2">Nombre</th>
          <th className="py-2">Telefono</th>
          <th className="py-2">Acciones</th>
        </tr>
      </thead>
      <tbody>
        {customers.map((customer) => (
          <tr key={customer.id} className="border-b border-gray-100">
            <td className="py-2">{customer.fullName ?? "-"}</td>
            <td className="py-2">{customer.phone ?? "-"}</td>
            <td className="py-2">
              <Link to={`/customers/${customer.id}`} className="text-brand-primary hover:underline">
                Ver
              </Link>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
