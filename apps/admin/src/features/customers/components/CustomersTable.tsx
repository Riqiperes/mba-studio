import { Link, useNavigate } from "react-router-dom";
import type { Customer } from "../types/Customer";

type Props = {
  customers: Customer[];
};

export function CustomersTable({ customers }: Props) {
  const navigate = useNavigate();

  if (customers.length === 0) {
    return <p className="vacio">Todavía no hay clientes.</p>;
  }

  return (
    <div className="tabla-contenedor">
    <table id="customers-table" className="tabla">
        <thead>
          <tr>
            <th>Nombre</th>
            <th>Telefono</th>
          </tr>
        </thead>
        <tbody>
          {customers.map((customer) => (
            <tr
              key={customer.id}
              onClick={() => navigate(`/customers/${customer.id}`)}
              className="cursor-pointer"
            >
              <td>
                <Link to={`/customers/${customer.id}`} className="font-medium text-texto hover:text-acento" onClick={(event) => event.stopPropagation()}>
                  {customer.fullName ?? "-"}
                </Link>
              </td>
              <td>{customer.phone ?? "-"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
