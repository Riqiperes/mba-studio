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
    return <p className="text-sm text-gray-500">Todavia no hay alumnos.</p>;
  }

  const showActions = Boolean(onEdit || onToggleActive);

  return (
    <table id="dependents-table" className="w-full border-collapse text-sm">
      <thead>
        <tr className="border-b border-gray-200 text-left text-gray-500">
          <th className="py-2">Nombre</th>
          {showGuardianColumn && <th className="py-2">Tutor</th>}
          <th className="py-2">Fecha de nacimiento</th>
          <th className="py-2">Estado</th>
          {showActions && <th className="py-2">Acciones</th>}
        </tr>
      </thead>
      <tbody>
        {dependents.map((dependent) => (
          <tr key={dependent.id} className="border-b border-gray-100">
            <td className="py-2">{dependent.fullName}</td>
            {showGuardianColumn && <td className="py-2">{formatGuardian(dependent)}</td>}
            <td className="py-2">{dependent.birthDate ?? "-"}</td>
            <td className="py-2">
              <span
                className={
                  dependent.active
                    ? "rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-700"
                    : "rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500"
                }
              >
                {dependent.active ? "Activo" : "Inactivo"}
              </span>
            </td>
            {showActions && (
              <td className="py-2">
                {onEdit && (
                  <button
                    type="button"
                    onClick={() => onEdit(dependent)}
                    className="mr-3 text-brand-primary hover:underline"
                  >
                    Editar
                  </button>
                )}
                {onToggleActive && (
                  <button
                    type="button"
                    onClick={() => onToggleActive(dependent)}
                    className="text-gray-600 hover:underline"
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
  );
}
