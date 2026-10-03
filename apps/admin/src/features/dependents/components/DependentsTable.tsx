import type { Dependent, DependentWithGuardian } from "../types/Dependent";

type DependentRow = Dependent | DependentWithGuardian;

type Props = {
  dependents: DependentRow[];
  showGuardianColumn?: boolean;
  onEdit?: (dependent: Dependent) => void;
  onToggleActive?: (dependent: Dependent) => void;
};

function formatGuardian(dependent: DependentRow): string {
  const name = dependent.guardianName ?? "-";
  if (dependent.guardianPhone) {
    return `${name} (${dependent.guardianPhone})`;
  }
  return name;
}

export function DependentsTable({ dependents, showGuardianColumn, onEdit, onToggleActive }: Props) {
  if (dependents.length === 0) {
    return <p className="vacio">Todavía no hay alumnos.</p>;
  }

  const showActions = Boolean(onEdit || onToggleActive);

  return (
    <div className="tabla-contenedor">
    <table id="dependents-table" className="tabla">
        <thead>
          <tr>
            <th>Nombre</th>
            {showGuardianColumn && <th>Tutor</th>}
            <th>Fecha de nacimiento</th>
            <th>Estado</th>
            {showActions && <th>Acciones</th>}
          </tr>
        </thead>
        <tbody>
          {dependents.map((dependent) => (
            <tr key={dependent.id}>
              <td>{dependent.fullName}</td>
              {showGuardianColumn && <td>{formatGuardian(dependent)}</td>}
              <td>{dependent.birthDate ?? "-"}</td>
              <td>
                <span
                  className={
                    dependent.active
                      ? "rounded-full bg-suave px-2 py-0.5 text-pequeno text-exito"
                      : "rounded-full bg-suave px-2 py-0.5 text-pequeno text-texto-suave"
                  }
                >
                  {dependent.active ? "Activo" : "Inactivo"}
                </span>
              </td>
              {showActions && (
                <td>
                  {onEdit && (
                    <button
                      type="button"
                      onClick={() => onEdit(dependent)}
                      className="accion text-acento"
                    >
                      Editar
                    </button>
                  )}
                  {onToggleActive && (
                    <button
                      type="button"
                      onClick={() => onToggleActive(dependent)}
                      className="accion text-texto-suave"
                    >
                      {dependent.active ? "Desactivar" : "Activar"}
                    </button>
                  )}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
