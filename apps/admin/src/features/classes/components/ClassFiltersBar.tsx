import type { Instructor } from "@/features/instructors/types/Instructor";
import type { ClassFilters, StudioClassStatus } from "../types/StudioClass";

const STATUS_OPTIONS: StudioClassStatus[] = ["SCHEDULED", "CANCELLED", "COMPLETED"];

type Props = {
  instructors: Instructor[];
  filters: ClassFilters;
  onChange: (next: ClassFilters) => void;
};

export function ClassFiltersBar({ instructors, filters, onChange }: Props) {
  function updateInstructorFilter(value: string) {
    const nextFilters: ClassFilters = { ...filters };
    if (value) {
      nextFilters.instructorId = value;
    } else {
      delete nextFilters.instructorId;
    }
    onChange(nextFilters);
  }

  function updateStatusFilter(value: string) {
    const nextFilters: ClassFilters = { ...filters };
    if (value) {
      nextFilters.status = value as StudioClassStatus;
    } else {
      delete nextFilters.status;
    }
    onChange(nextFilters);
  }

  function updateDateFromFilter(value: string) {
    const nextFilters: ClassFilters = { ...filters };
    if (value) {
      nextFilters.dateFrom = value;
    } else {
      delete nextFilters.dateFrom;
    }
    onChange(nextFilters);
  }

  function updateDateToFilter(value: string) {
    const nextFilters: ClassFilters = { ...filters };
    if (value) {
      nextFilters.dateTo = value;
    } else {
      delete nextFilters.dateTo;
    }
    onChange(nextFilters);
  }

  return (
    <div id="class-filters-bar" className="mb-4 flex flex-wrap gap-2">
      <select
        id="class-filter-instructor"
        value={filters.instructorId ?? ""}
        onChange={(event) => updateInstructorFilter(event.target.value)}
        className="rounded-md border border-gray-300 px-2 py-1 text-sm"
      >
        <option value="">Todos los instructores</option>
        {instructors.map((instructor) => (
          <option key={instructor.id} value={instructor.id}>
            {instructor.fullName}
          </option>
        ))}
      </select>

      <select
        id="class-filter-status"
        value={filters.status ?? ""}
        onChange={(event) => updateStatusFilter(event.target.value)}
        className="rounded-md border border-gray-300 px-2 py-1 text-sm"
      >
        <option value="">Todos los estados</option>
        {STATUS_OPTIONS.map((status) => (
          <option key={status} value={status}>
            {status}
          </option>
        ))}
      </select>

      <input
        id="class-filter-date-from"
        type="date"
        value={filters.dateFrom ?? ""}
        onChange={(event) => updateDateFromFilter(event.target.value)}
        className="rounded-md border border-gray-300 px-2 py-1 text-sm"
      />
      <input
        id="class-filter-date-to"
        type="date"
        value={filters.dateTo ?? ""}
        onChange={(event) => updateDateToFilter(event.target.value)}
        className="rounded-md border border-gray-300 px-2 py-1 text-sm"
      />
    </div>
  );
}
