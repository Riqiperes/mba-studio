import { useNavigate } from "react-router-dom";
import type { Customer } from "../types/Customer";

type Props = {
  customers: Customer[];
};

export function CustomersTable({ customers }: Props) {
  const navigate = useNavigate();

  if (customers.length === 0) {
    return <p className="text-sm text-gray-500">Todavia no hay clientes.</p>;
  }

  return (
    <table id="customers-table" className="w-full border-collapse text-sm">
      <thead>
        <tr className="border-b border-gray-200 text-left text-gray-500">
          <th className="py-2">Nombre</th>
          <th className="py-2">Telefono</th>
        </tr>
      </thead>
      <tbody>
        {customers.map((customer) => (
          <tr
            key={customer.id}
            onClick={() => navigate(`/customers/${customer.id}`)}
            className="cursor-pointer border-b border-gray-100 hover:bg-gray-50"
          >
            <td className="py-2">{customer.fullName ?? "-"}</td>
            <td className="py-2">{customer.phone ?? "-"}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
