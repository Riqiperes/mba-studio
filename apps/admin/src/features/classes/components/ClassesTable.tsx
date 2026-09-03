import { useNavigate } from "react-router-dom";
import type { Instructor } from "@/features/instructors/types/Instructor";
import type { StudioClass } from "../types/StudioClass";

type Props = {
  classes: StudioClass[];
  instructors: Instructor[];
  onEdit: (studioClass: StudioClass) => void;
  onCancel: (studioClass: StudioClass) => void;
};

export function ClassesTable({ classes, instructors, onEdit, onCancel }: Props) {
  const navigate = useNavigate();

  if (classes.length === 0) {
    return <p className="text-sm text-gray-500">No hay clases con estos filtros.</p>;
  }

  function instructorName(instructorId: string): string {
    return instructors.find((i) => i.id === instructorId)?.fullName ?? "—";
  }

  return (
    <table id="classes-table" className="w-full border-collapse text-sm">
      <thead>
        <tr className="border-b border-gray-200 text-left text-gray-500">
          <th className="py-2">Titulo</th>
          <th className="py-2">Instructor</th>
          <th className="py-2">Horario</th>
          <th className="py-2">Cupo</th>
          <th className="py-2">Estado</th>
          <th className="py-2">Acciones</th>
        </tr>
      </thead>
      <tbody>
        {classes.map((studioClass) => (
          <tr
            key={studioClass.id}
            onClick={() => navigate(`/classes/${studioClass.id}`)}
            className="cursor-pointer border-b border-gray-100 hover:bg-gray-50"
          >
            <td className="py-2">{studioClass.title}</td>
            <td className="py-2">{instructorName(studioClass.instructorId)}</td>
            <td className="py-2">
              {new Date(studioClass.startsAt).toLocaleString()} –{" "}
              {new Date(studioClass.endsAt).toLocaleTimeString()}
            </td>
            <td className="py-2">{studioClass.maxCapacity}</td>
            <td className="py-2">{studioClass.status}</td>
            <td className="py-2">
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  onEdit(studioClass);
                }}
                className="mr-3 text-brand-primary hover:underline"
              >
                Editar
              </button>
              {studioClass.status === "SCHEDULED" && (
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    onCancel(studioClass);
                  }}
                  className="text-red-600 hover:underline"
                >
                  Cancelar
                </button>
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
