import { useState } from "react";
import { useParams } from "react-router-dom";
import { BookCustomerModal } from "@/features/bookings/components/BookCustomerModal";
import { useClassBookings } from "@/features/bookings/hooks/useClassBookings";
import { useClasses } from "@/features/classes/hooks/useClasses";
import { useCustomers } from "@/features/customers/hooks/useCustomers";
import { getErrorMessage } from "@/utils/getErrorMessage";

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
    return <div className="mx-auto max-w-3xl p-6 text-sm text-gray-500">Cargando...</div>;
  }

  if (classesError || !studioClass) {
    return (
      <div className="mx-auto max-w-3xl p-6 text-sm text-red-600">
        {classesError ?? "Clase no encontrada."}
      </div>
    );
  }

  return (
    <div id="class-bookings-page" className="mx-auto max-w-3xl p-6">
      <h1 className="mb-1 text-xl font-semibold text-brand-primary">{studioClass.title}</h1>
      <p className="mb-4 text-sm text-gray-500">
        Cupo: {bookings.length}/{studioClass.maxCapacity}
      </p>

      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}
      {actionError && <p className="mb-4 text-sm text-red-600">{actionError}</p>}

      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-brand-primary">Reservados</h2>
        <button
          type="button"
          onClick={() => setModalOpen(true)}
          disabled={isFull}
          className="rounded-md bg-brand-primary px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
        >
          Reservar cliente
        </button>
      </div>

      {loading && <p className="text-sm text-gray-500">Cargando...</p>}
      {!loading && bookings.length === 0 && (
        <p className="mb-6 text-sm text-gray-500">Todavia no hay reservaciones.</p>
      )}
      {!loading && bookings.length > 0 && (
        <table id="bookings-table" className="mb-6 w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-gray-200 text-left text-gray-500">
              <th className="py-2">Cliente</th>
              <th className="py-2">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {bookings.map((booking) => (
              <tr key={booking.id} className="border-b border-gray-100">
                <td className="py-2">{booking.customerName ?? "-"}</td>
                <td className="py-2">
                  <button
                    type="button"
                    onClick={() => handleCancel(booking.id)}
                    className="text-gray-600 hover:underline"
                  >
                    Cancelar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-brand-primary">Lista de espera</h2>
        {isFull && (
          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className="rounded-md border border-brand-primary px-4 py-2 text-sm font-medium text-brand-primary hover:bg-brand-primary hover:text-white"
          >
            Agregar a lista de espera
          </button>
        )}
      </div>

      {waitlist.length === 0 && <p className="text-sm text-gray-500">Nadie en lista de espera.</p>}
      {waitlist.length > 0 && (
        <table id="waitlist-table" className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-gray-200 text-left text-gray-500">
              <th className="py-2">Cliente</th>
              <th className="py-2">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {waitlist.map((entry) => (
              <tr key={entry.id} className="border-b border-gray-100">
                <td className="py-2">{entry.customerName ?? "-"}</td>
                <td className="py-2">
                  <button
                    type="button"
                    onClick={() => handlePromote(entry.id)}
                    disabled={isFull}
                    className="mr-3 text-brand-primary hover:underline disabled:opacity-50"
                  >
                    Promover
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRemoveWaiting(entry.id)}
                    className="text-gray-600 hover:underline"
                  >
                    Quitar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
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
