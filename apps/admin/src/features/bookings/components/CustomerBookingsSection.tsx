import { Link } from "react-router-dom";
import { useCustomerBookings } from "../hooks/useCustomerBookings";
import type { CustomerBooking } from "../types/Booking";

function formatClassDate(iso: string): string {
  return new Date(iso).toLocaleString("es-MX", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function statusLabel(booking: CustomerBooking): { text: string; tone: string } {
  if (booking.status === "CANCELLED") {
    if (booking.cancelledByBusiness) return { text: "Cancelada por la academia", tone: "text-texto-suave" };
    return booking.refunded
      ? { text: "Cancelada (crédito devuelto)", tone: "text-texto-suave" }
      : { text: "Cancelada tarde (sin crédito)", tone: "text-alerta" };
  }
  return new Date(booking.classStartsAt).getTime() < Date.now()
    ? { text: "Pasada", tone: "text-texto-suave" }
    : { text: "Próxima", tone: "text-exito" };
}

/** Reservaciones del cliente (proximas primero, luego el historial), en su ficha de admin. */
export function CustomerBookingsSection({ customerId }: { customerId: string }) {
  const { bookings, loading, error } = useCustomerBookings(customerId);

  return (
    <section id="customer-bookings-section" aria-labelledby="customer-bookings-title" className="mb-8">
      <h2 id="customer-bookings-title" className="mb-4 font-display text-subtitulo font-medium text-texto">
        Reservaciones
      </h2>
      {loading && <p role="status" className="text-pequeno text-texto-suave">Cargando…</p>}
      {error && (
        <p role="alert" className="alerta-entra rounded-control bg-suave px-3 py-2 text-pequeno text-alerta">
          {error}
        </p>
      )}
      {!loading && !error && bookings.length === 0 && <p className="vacio">Todavía no tiene reservaciones.</p>}
      {!loading && !error && bookings.length > 0 && (
        <div className="entra tabla-contenedor">
          <table id="customer-bookings-table" className="tabla">
            <thead>
              <tr>
                <th>Clase</th>
                <th>Fecha</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {bookings.map((booking) => {
                const status = statusLabel(booking);
                return (
                  <tr key={booking.id}>
                    <td>
                      <Link
                        to={`/classes/${booking.classId}`}
                        className="font-medium text-texto underline-offset-4 hover:text-acento hover:underline"
                      >
                        {booking.classTitle}
                      </Link>
                    </td>
                    <td className="whitespace-nowrap tabular-nums">{formatClassDate(booking.classStartsAt)}</td>
                    <td className={`font-medium ${status.tone}`}>{status.text}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
