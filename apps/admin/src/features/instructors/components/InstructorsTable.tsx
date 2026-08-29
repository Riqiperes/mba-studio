import type { Instructor } from "../types/Instructor";

type Props = {
  instructors: Instructor[];
  onEdit: (instructor: Instructor) => void;
  onToggleActive: (instructor: Instructor) => void;
};

export function InstructorsTable({ instructors, onEdit, onToggleActive }: Props) {
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
          <tr key={instructor.id} className="border-b border-gray-100">
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
                onClick={() => onEdit(instructor)}
                className="mr-3 text-brand-primary hover:underline"
              >
                Editar
              </button>
              <button
                type="button"
                onClick={() => onToggleActive(instructor)}
                className="text-gray-600 hover:underline"
              >
                {instructor.active ? "Desactivar" : "Activar"}
              </button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
