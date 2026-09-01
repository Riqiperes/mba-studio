import type { ClassFilters } from "../types/StudioClass";

type Props = {
  instructors: { id: string; fullName: string }[];
  filters: ClassFilters;
  onChange: (filters: ClassFilters) => void;
  onClear: () => void;
};

export function ClassesFilterBar({
  instructors,
  filters,
  onChange,
  onClear,
}: Props) {
  return (
    <div id="classes-filter-bar" className="mb-6 flex flex-col gap-4 rounded-lg border border-gray-200 bg-white p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-1 flex-col gap-1">
          <label htmlFor="classes-instructor-filter" className="text-xs font-medium text-gray-500">
            Instructor
          </label>
          <select
            id="classes-instructor-filter"
            value={filters.instructorId ?? ""}
            onChange={(e) => onChange({ ...filters, instructorId: e.target.value })}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm"
          >
            <option value="">Todos los instructores</option>
            {instructors.map((instructor) => (
              <option key={instructor.id} value={instructor.id}>
                {instructor.fullName}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-1 flex-col gap-1">
          <label htmlFor="classes-date-from" className="text-xs font-medium text-gray-500">
            Desde
          </label>
          <input
            id="classes-date-from"
            type="date"
            value={filters.dateFrom ?? ""}
            onChange={(e) => onChange({ ...filters, dateFrom: e.target.value })}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
        </div>

        <div className="flex flex-1 flex-col gap-1">
          <label htmlFor="classes-date-to" className="text-xs font-medium text-gray-500">
            Hasta
          </label>
          <input
            id="classes-date-to"
            type="date"
            value={filters.dateTo ?? ""}
            onChange={(e) => onChange({ ...filters, dateTo: e.target.value })}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
        </div>

        <div className="flex items-end">
          <button
            type="button"
            onClick={onClear}
            className="rounded-md border border-gray-300 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50"
          >
            Limpiar filtros
          </button>
        </div>
      </div>
    </div>
  );
}