import type { Instructor } from "../types/Instructor";

type Props = {
  instructors: Instructor[];
  onEdit: (instructor: Instructor) => void;
  onToggleActive: (instructor: Instructor) => void;
  onDelete: (instructor: Instructor) => void;
};

export function InstructorsTable({ instructors, onEdit, onToggleActive, onDelete }: Props) {
  if (instructors.length === 0) {
    return <p className="vacio">Todavía no hay instructores.</p>;
  }

  return (
    <div className="tabla-contenedor">
    <table id="instructors-table" className="tabla">
        <thead>
          <tr>
            <th>Nombre</th>
            <th>Estado</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {instructors.map((instructor) => (
            <tr
              key={instructor.id}
              onClick={() => onEdit(instructor)}
              className="cursor-pointer"
            >
              <td>
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    onEdit(instructor);
                  }}
                  className="text-start font-medium text-texto hover:text-acento"
                >
                  {instructor.fullName}
                </button>
              </td>
              <td>
                <span
                  className={
                    instructor.active
                      ? "rounded-full bg-suave px-2 py-0.5 text-pequeno text-exito"
                      : "rounded-full bg-suave px-2 py-0.5 text-pequeno text-texto-suave"
                  }
                >
                  {instructor.active ? "Activo" : "Inactivo"}
                </span>
              </td>
              <td>
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    onToggleActive(instructor);
                  }}
                  className="accion text-texto-suave"
                >
                  {instructor.active ? "Desactivar" : "Activar"}
                </button>
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    onDelete(instructor);
                  }}
                  className="accion text-alerta"
                >
                  Eliminar
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
