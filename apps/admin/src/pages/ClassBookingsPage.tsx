import { useState } from "react";
import { useParams } from "react-router-dom";
import { BookCustomerModal } from "@/features/bookings/components/BookCustomerModal";
import { useClassBookings } from "@/features/bookings/hooks/useClassBookings";
import { useClasses } from "@/features/classes/hooks/useClasses";
import { useCustomers } from "@/features/customers/hooks/useCustomers";
import { getErrorMessage } from "@/utils/getErrorMessage";
import { BackButton } from "@/components/ui/BackButton";
import { buttonClasses } from "@/components/ui/buttonStyles";
import { LoadingState } from "@/components/ui/LoadingState";
import { ErrorState } from "@/components/ui/ErrorState";

export function ClassBookingsPage() {
  const { id } = useParams<{ id: string }>();
  const classId = id ?? "";
  const { classes, loading: classesLoading, error: classesError } = useClasses({});
  const studioClass = classes.find((c) => c.id === classId);
  const { customers } = useCustomers();
  const { bookings, waitlist, loading, error, book, cancel, addWaiting, removeWaiting, promote } =
    useClassBookings(classId, studioClass?.businessId ?? "");

  const [modalOpen, setModalOpen] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const isFull = studioClass ? bookings.length >= studioClass.maxCapacity : false;

  async function handleCancel(bookingId: string) {
    if (!window.confirm("Cancelar esta reservacion?")) return;
    setActionError(null);
    try {
      await cancel(bookingId);
    } catch (err) {
      setActionError(getErrorMessage(err, "No se pudo cancelar."));
      console.error("[bookings] cancelar fallo", err);
    }
  }

  async function handlePromote(waitlistId: string) {
    setActionError(null);
    try {
      await promote(waitlistId);
    } catch (err) {
      setActionError(getErrorMessage(err, "No se pudo promover."));
      console.error("[waitlist] promover fallo", err);
    }
  }

  async function handleRemoveWaiting(id: string) {
    setActionError(null);
    try {
      await removeWaiting(id);
    } catch (err) {
      setActionError(getErrorMessage(err, "No se pudo quitar de la lista."));
      console.error("[waitlist] quitar fallo", err);
    }
  }

  async function handleModalSubmit(customerId: string) {
    if (isFull) {
      await addWaiting(customerId);
    } else {
      await book(customerId);
    }
  }

  if (classesLoading) {
    return <LoadingState message="Cargando…" />;
  }

  if (classesError || !studioClass) {
    return (
      <div className="mx-auto max-w-3xl p-4 text-cuerpo sm:p-6">
        <BackButton />
        <ErrorState message={classesError ?? "Clase no encontrada."} />
      </div>
    );
  }

  return (
    <div id="class-bookings-page" className="mx-auto max-w-3xl p-4 sm:p-6">
      <BackButton />
      <p className="etiqueta mb-2">Estudio · Clase</p>
      <h1 className="mb-1 font-display text-titulo font-medium text-texto">{studioClass.title}</h1>
      <p className="mb-4 text-sm text-texto-suave">
        Cupo: {bookings.length}/{studioClass.maxCapacity}
      </p>

      {error && <p role="alert" className="mb-4 flex items-start gap-2 rounded-control bg-suave px-3 py-2 text-pequeno text-alerta">{error}</p>}
      {actionError && <p role="alert" className="mb-4 flex items-start gap-2 rounded-control bg-suave px-3 py-2 text-pequeno text-alerta">{actionError}</p>}

      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-display text-subtitulo font-medium text-texto">Reservados</h2>
        <button
          type="button"
          onClick={() => setModalOpen(true)}
          disabled={isFull}
          className={buttonClasses("primary", "md")}
        >
          Reservar cliente
        </button>
      </div>

      {loading && <p role="status" className="text-pequeno text-texto-suave">Cargando…</p>}
      {!loading && bookings.length === 0 && (
        <p className="mb-6 vacio">Todavía no hay reservaciones.</p>
      )}
      {!loading && bookings.length > 0 && (
        <div className="tabla-contenedor mb-6">
          <table id="bookings-table" className="tabla">
            <thead>
              <tr>
                <th>Cliente</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {bookings.map((booking) => (
                <tr key={booking.id}>
                  <td>{booking.customerName ?? "-"}</td>
                  <td>
                    <button
                      type="button"
                      onClick={() => handleCancel(booking.id)}
                      className="accion text-texto-suave"
                    >
                      Cancelar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-display text-subtitulo font-medium text-texto">Lista de espera</h2>
        {isFull && (
          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className={buttonClasses("secondary", "md")}
          >
            Agregar a lista de espera
          </button>
        )}
      </div>

      {waitlist.length === 0 && <p className="vacio">Nadie en lista de espera.</p>}
      {waitlist.length > 0 && (
        <div className="tabla-contenedor">
        <table id="waitlist-table" className="tabla">
            <thead>
              <tr>
                <th>Cliente</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {waitlist.map((entry) => (
                <tr key={entry.id}>
                  <td>{entry.customerName ?? "-"}</td>
                  <td>
                    <button
                      type="button"
                      onClick={() => handlePromote(entry.id)}
                      disabled={isFull}
                      className="accion text-acento"
                    >
                      Promover
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRemoveWaiting(entry.id)}
                      className="accion text-texto-suave"
                    >
                      Quitar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <BookCustomerModal
        open={modalOpen}
        title={isFull ? "Agregar a lista de espera" : "Reservar cliente"}
        submitLabel={isFull ? "Agregar" : "Reservar"}
        customers={customers}
        onClose={() => setModalOpen(false)}
        onSubmit={handleModalSubmit}
      />
    </div>
  );
}
