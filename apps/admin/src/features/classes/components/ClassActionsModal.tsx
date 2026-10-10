import { Link } from "react-router-dom";
import { ModalDialog } from "@/components/ui/ModalDialog";
import { Button } from "@/components/ui/Button";
import { buttonClasses } from "@/components/ui/buttonStyles";
import { ClassCapacityBar } from "@/components/ui/ClassCapacityBar";
import { ClassEnrolledCustomersList } from "@/features/bookings/components/ClassEnrolledCustomersList";
import type { ClassOccupancy, StudioClass } from "../types/StudioClass";
import { classOccupancyLabel } from "../utils/classOccupancyLabel";

type Props = {
  studioClass: StudioClass | null;
  instructorName: string;
  /** Reservados y lista de espera (useClassOccupancy). */
  occupancy: ClassOccupancy | undefined;
  onClose: () => void;
  onEdit: (studioClass: StudioClass) => void;
  onCancel: (studioClass: StudioClass) => void;
  onDelete: (studioClass: StudioClass) => void;
};

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" });
}

/**
 * Acciones de una clase al tocar su tarjeta (pensado para telefono: botones
 * grandes en vez de enlaces de texto chicos dentro de la tarjeta).
 */
export function ClassActionsModal({ studioClass, instructorName, occupancy, onClose, onEdit, onCancel, onDelete }: Props) {
  // Cierra primero para que el confirm/modal siguiente no quede debajo de este dialog
  function run(action: (studioClass: StudioClass) => void) {
    if (!studioClass) return;
    onClose();
    action(studioClass);
  }

  return (
    <ModalDialog
      id="class-actions-modal"
      open={studioClass !== null}
      onClose={onClose}
      title={studioClass?.title ?? ""}
      description={
        studioClass
          ? `${new Date(studioClass.startsAt).toLocaleDateString("es-MX", { weekday: "long", day: "numeric", month: "long" })}, ${formatTime(studioClass.startsAt)}–${formatTime(studioClass.endsAt)}`
          : undefined
      }
    >
      {studioClass && (
        <div className="flex flex-col gap-3">
          <p className="text-pequeno text-texto-suave">
            {instructorName}
            {studioClass.status !== "SCHEDULED" && <span className="ms-2 font-medium text-alerta">Cancelada</span>}
          </p>
          <ClassCapacityBar
            booked={occupancy?.booked ?? 0}
            capacity={studioClass.maxCapacity}
            label={classOccupancyLabel(studioClass.maxCapacity, occupancy)}
          />
          <ClassEnrolledCustomersList classId={studioClass.id} businessId={studioClass.businessId} />
          <Link to={`/classes/${studioClass.id}`} className={`${buttonClasses("primary", "lg")} w-full`}>
            Ver reservaciones
          </Link>
          <Button variant="outline" size="lg" className="w-full" onClick={() => run(onEdit)}>
            Editar
          </Button>
          {studioClass.status === "SCHEDULED" && (
            <Button variant="outline" size="lg" className="w-full" onClick={() => run(onCancel)}>
              Cancelar clase
            </Button>
          )}
          <Button variant="danger" size="lg" className="w-full" onClick={() => run(onDelete)}>
            Eliminar clase
          </Button>
        </div>
      )}
    </ModalDialog>
  );
}
