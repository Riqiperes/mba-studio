import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { HeartPulse } from "lucide-react";
import { BookCustomerModal, type BookingTarget } from "@/features/bookings/components/BookCustomerModal";
import { useClassBookings } from "@/features/bookings/hooks/useClassBookings";
import { useClasses } from "@/features/classes/hooks/useClasses";
import { useCustomers } from "@/features/customers/hooks/useCustomers";
import { getErrorMessage } from "@/utils/getErrorMessage";
import { BackButton } from "@/components/ui/BackButton";
import { ClassCapacityBar } from "@/components/ui/ClassCapacityBar";
import { classOccupancyLabel } from "@/features/classes/utils/classOccupancyLabel";
import { buttonClasses } from "@/components/ui/buttonStyles";
import { LoadingState } from "@/components/ui/LoadingState";
import { ErrorState } from "@/components/ui/ErrorState";
import { useAppFeedback } from "@/components/ui/AppFeedbackContext";
import { CANCELLATION_REFUND_WINDOW_HOURS, isLateCancellation } from "@mba-studio/shared";

export function ClassBookingsPage() {
  const { id } = useParams<{ id: string }>();
  const classId = id ?? "";
  const navigate = useNavigate();
  const {
    classes,
    loading: classesLoading,
    error: classesError,
    cancel: cancelClass,
    remove: removeClass,
  } = useClasses({});
  const studioClass = classes.find((c) => c.id === classId);
  const { customers } = useCustomers();
  const { bookings, waitlist, loading, error, reload, book, bookGuestByName, cancel, addWaiting, addWaitingGuest, removeWaiting, promote } =
    useClassBookings(classId, studioClass?.businessId ?? "");

  const [modalOpen, setModalOpen] = useState(false);
  const { notify, confirm } = useAppFeedback();

  const isFull = studioClass ? bookings.length >= studioClass.maxCapacity : false;

  async function handleCancel(bookingId: string) {
    const booking = bookings.find((item) => item.id === bookingId);
    if (booking && booking.customerId === null) {
      const ok = await confirm({
        title: `¿Cancelar la reservación de ${booking.customerName ?? "esta persona"}?`,
        description: "Es un cliente no registrado: se libera el lugar y no hay créditos que devolver.",
        confirmLabel: "Sí, cancelar",
        cancelLabel: "No, conservar",
        tone: "danger",
      });
      if (!ok) return;
      try {
        await cancel(bookingId);
        notify("Reservación cancelada.");
      } catch (err) {
        notify(getErrorMessage(err, "No se pudo cancelar."), "error");
        console.error("[bookings] cancelar fallo", err);
      }
      return;
    }
    const late = studioClass ? isLateCancellation(studioClass.startsAt) : false;
    const ok = await confirm({
      title: late ? "Se consumirá el crédito del cliente" : "¿Cancelar esta reservación?",
      description: late
        ? `Faltan menos de ${CANCELLATION_REFUND_WINDOW_HOURS} horas para la clase. Si cancelas ahora, el crédito no se devuelve al cliente.`
        : "El crédito regresará al saldo del cliente.",
      confirmLabel: "Sí, cancelar",
      cancelLabel: "No, conservar",
      tone: "danger",
    });
    if (!ok) return;
    try {
      await cancel(bookingId);
      notify(late ? "Reservación cancelada sin devolver el crédito." : "Reservación cancelada. El crédito regresó al cliente.");
    } catch (err) {
      notify(getErrorMessage(err, "No se pudo cancelar."), "error");
      console.error("[bookings] cancelar fallo", err);
    }
  }

  async function handleCancelClass() {
    if (!studioClass) return;
    const ok = await confirm({
      title: `¿Cancelar la clase "${studioClass.title}"?`,
      description:
        bookings.length > 0
          ? `Se cancelarán ${bookings.length === 1 ? "1 reservación" : `${bookings.length} reservaciones`}, se devolverá el crédito a cada cliente registrado y se vaciará la lista de espera.`
          : "No tiene reservaciones. Se vaciará la lista de espera.",
      confirmLabel: "Cancelar clase",
      tone: "danger",
    });
    if (!ok) return;
    try {
      await cancelClass(studioClass.id);
      notify("Clase cancelada. Se devolvieron los créditos de las reservaciones.");
      await reload();
    } catch (err) {
      notify(getErrorMessage(err, "No se pudo cancelar la clase."), "error");
      console.error("[classes] cancelar fallo", err);
    }
  }

  async function handleDeleteClass() {
    if (!studioClass) return;
    const ok = await confirm({
      title: `¿Eliminar la clase "${studioClass.title}"?`,
      description: "Esta acción no se puede deshacer.",
      confirmLabel: "Eliminar clase",
      tone: "danger",
    });
    if (!ok) return;
    try {
      await removeClass(studioClass.id);
      notify("Clase eliminada.");
      navigate("/classes", { replace: true });
    } catch (err) {
      notify(getErrorMessage(err, "No se pudo eliminar la clase."), "error");
      console.error("[classes] eliminar fallo", err);
    }
  }

  async function handlePromote(waitlistId: string) {
    const isGuest = waitlist.find((entry) => entry.id === waitlistId)?.customerId === null;
    const ok = await confirm({
      title: "¿Pasar a reservación?",
      description: isGuest
        ? "Se reservará el lugar. Es un cliente no registrado: no usa créditos."
        : "Se reservará el lugar y se descontará 1 crédito al cliente.",
      confirmLabel: "Promover",
    });
    if (!ok) return;
    try {
      await promote(waitlistId);
      notify("Cliente promovido de la lista de espera.");
    } catch (err) {
      notify(getErrorMessage(err, "No se pudo promover."), "error");
      console.error("[waitlist] promover fallo", err);
    }
  }

  async function handleRemoveWaiting(id: string) {
    const ok = await confirm({ title: "¿Quitar de la lista de espera?", confirmLabel: "Quitar", tone: "danger" });
    if (!ok) return;
    try {
      await removeWaiting(id);
      notify("Cliente quitado de la lista de espera.");
    } catch (err) {
      notify(getErrorMessage(err, "No se pudo quitar de la lista."), "error");
      console.error("[waitlist] quitar fallo", err);
    }
  }

  async function handleModalSubmit(target: BookingTarget) {
    if (target.kind === "guest") {
      if (isFull) {
        await addWaitingGuest(target.guestName);
        notify(`${target.guestName} agregado a la lista de espera.`);
      } else {
        await bookGuestByName(target.guestName);
        notify(`${target.guestName} reservado (no registrado, sin créditos).`);
      }
      return;
    }
    if (isFull) {
      await addWaiting(target.customerId);
      notify("Cliente agregado a la lista de espera.");
    } else {
      await book(target.customerId);
      notify("Clase reservada. Se descontó 1 crédito al cliente.");
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
    <div id="class-bookings-page" className="entra mx-auto max-w-3xl p-4 sm:p-6">
      <BackButton />
      <p className="etiqueta mb-2">Estudio · Clase</p>
      <h1 className="mb-1 font-display text-titulo font-medium text-texto">{studioClass.title}</h1>
      {studioClass.status !== "SCHEDULED" && <p className="mb-2 text-sm font-medium text-alerta">Cancelada</p>}
      <div id="class-bookings-capacity" className="mb-4 max-w-sm">
        <ClassCapacityBar
          booked={bookings.length}
          capacity={studioClass.maxCapacity}
          label={classOccupancyLabel(studioClass.maxCapacity, { booked: bookings.length, waiting: waitlist.length })}
        />
      </div>

      <div id="class-detail-actions" className="mb-6 flex flex-wrap gap-2">
        {studioClass.status === "SCHEDULED" && (
          <button type="button" onClick={handleCancelClass} className={buttonClasses("outline", "md")}>
            Cancelar clase
          </button>
        )}
        <button type="button" onClick={handleDeleteClass} className={buttonClasses("danger", "md")}>
          Eliminar clase
        </button>
      </div>

      {error && <p role="alert" className="alerta-entra mb-4 flex items-start gap-2 rounded-control bg-suave px-3 py-2 text-pequeno text-alerta">{error}</p>}

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
        <div className="entra tabla-contenedor mb-6">
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
                  <td>
                    {booking.customerId ? (
                      <Link
                        to={`/customers/${booking.customerId}`}
                        className="font-medium text-texto underline-offset-4 hover:text-acento hover:underline"
                      >
                        {booking.customerName ?? "-"}
                      </Link>
                    ) : (
                      <span className="font-medium text-texto">
                        {booking.customerName ?? "-"}
                        <GuestBadge />
                      </span>
                    )}
                    {booking.customerMedicalConditions && (
                      <p className="mt-1 flex items-start gap-1.5 text-pequeno text-alerta">
                        <HeartPulse className="mt-px h-4 w-4 shrink-0" strokeWidth={1.8} aria-hidden="true" />
                        <span>
                          <span className="font-medium">Condición médica:</span> {booking.customerMedicalConditions}
                        </span>
                      </p>
                    )}
                  </td>
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
                  <td>
                    {entry.customerName ?? "-"}
                    {entry.customerId === null && <GuestBadge />}
                  </td>
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

/** Etiqueta para reservas/lista de espera de un cliente "No registrado". */
function GuestBadge() {
  return (
    <span className="ms-2 inline-flex rounded-full bg-suave px-2 py-0.5 text-pequeno font-medium text-texto-suave">
      No registrado
    </span>
  );
}
