import { Link } from "react-router-dom";
import { useClassBookings } from "../hooks/useClassBookings";

type Props = {
  classId: string;
  businessId: string;
};

/**
 * Lista desplegable de quienes estan inscritos a una clase, debajo de los
 * detalles del modal de acciones. Solo existe en apps/admin: la web solo
 * recibe el conteo (RPC class_booking_counts) y RLS no le deja leer
 * reservas ajenas.
 */
export function ClassEnrolledCustomersList({ classId, businessId }: Props) {
  const { bookings, waitlist, loading, error } = useClassBookings(classId, businessId);

  return (
    <details id="class-enrolled-customers" className="rounded-control border border-borde px-3 py-2" open>
      <summary className="cursor-pointer text-pequeno font-medium text-texto">
        Inscritos{!loading && !error && ` (${bookings.length})`}
        {!loading && waitlist.length > 0 && <span className="font-normal text-texto-suave"> · {waitlist.length} en espera</span>}
      </summary>
      <div className="mt-2 max-h-56 overflow-y-auto text-pequeno">
        {loading && <p role="status" className="text-texto-suave">Cargando…</p>}
        {error && <p role="alert" className="text-alerta">{error}</p>}
        {!loading && !error && bookings.length === 0 && <p className="text-texto-suave">Todavía no hay inscritos.</p>}
        {!loading && !error && bookings.length > 0 && (
          <ol className="list-decimal space-y-1 ps-5">
            {bookings.map((booking) => (
              <li key={booking.id} className="text-texto">
                {booking.customerId ? (
                  <Link to={`/customers/${booking.customerId}`} className="underline-offset-4 hover:text-acento hover:underline">
                    {booking.customerName ?? "-"}
                  </Link>
                ) : (
                  <>
                    {booking.customerName ?? "-"} <span className="text-texto-suave">(no registrado)</span>
                  </>
                )}
              </li>
            ))}
          </ol>
        )}
      </div>
    </details>
  );
}
