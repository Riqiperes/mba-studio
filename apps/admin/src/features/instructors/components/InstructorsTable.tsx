import type { Instructor } from "../types/Instructor";

type Props = {
  instructors: Instructor[];
  onEdit: (instructor: Instructor) => void;
  onToggleActive: (instructor: Instructor) => void;
  onDelete: (instructor: Instructor) => void;
};

export function InstructorsTable({ instructors, onEdit, onToggleActive, onDelete }: Props) {
  if (instructors.length === 0) {
    return <p className="text-sm text-gray-500">Todavia no hay instructores.</p>;
  }

  return (
    <table id="instructors-table" className="w-full border-collapse text-sm">
      <thead>
        <tr className="border-b border-gray-200 text-left text-gray-500">
          <th className="py-2">Nombre</th>
          <th className="py-2">Estado</th>
          <th className="py-2">Acciones</th>
        </tr>
      </thead>
      <tbody>
        {instructors.map((instructor) => (
          <tr
            key={instructor.id}
            onClick={() => onEdit(instructor)}
            className="cursor-pointer border-b border-gray-100 hover:bg-gray-50"
          >
            <td className="py-2">{instructor.fullName}</td>
            <td className="py-2">
              <span
                className={
                  instructor.active
                    ? "rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-700"
                    : "rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500"
                }
              >
                {instructor.active ? "Activo" : "Inactivo"}
              </span>
            </td>
            <td className="py-2">
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  onToggleActive(instructor);
                }}
                className="text-gray-600 hover:underline"
              >
                {instructor.active ? "Desactivar" : "Activar"}
              </button>
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  onDelete(instructor);
                }}
                className="ml-2 text-red-600 hover:underline"
              >
                Eliminar
              </button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
