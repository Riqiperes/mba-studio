import type { Instructor } from "@/features/instructors/types/Instructor";
import type { ClassFilters } from "../types/StudioClass";

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
    </div>
  );
}
