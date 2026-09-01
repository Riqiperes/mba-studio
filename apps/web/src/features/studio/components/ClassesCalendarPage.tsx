import { useState } from "react";
import { useStudioClasses } from "@/features/studio/hooks/useStudioClasses";
import { ClassesCalendar } from "@/features/studio/components/ClassesCalendar";
import { ClassesFilterBar } from "@/features/studio/components/ClassesFilterBar";
import type { ClassFilters } from "@/features/studio/types/StudioClass";

export function ClassesCalendarPage() {
  const [filters, setFilters] = useState<ClassFilters>({
    instructorId: "",
    dateFrom: "",
    dateTo: "",
  });

  const { classes, instructors, loading, error } = useStudioClasses(filters);

  const handleFilterChange = (newFilters: ClassFilters) => {
    setFilters(newFilters);
  };

  const handleClearFilters = () => {
    setFilters({ instructorId: "", dateFrom: "", dateTo: "" });
  };

  const hasActiveFilters = Boolean(filters.instructorId || filters.dateFrom || filters.dateTo);

  return (
    <div id="classes-calendar-page" className="mx-auto max-w-5xl p-6">
      <header className="mb-8">
        <h1 className="text-2xl font-semibold text-brand-primary">Horario de clases</h1>
        <p className="mt-1 text-gray-600">
          Próximas clases de Pilates. Usa los filtros para encontrar la que buscas.
        </p>
      </header>

      <ClassesFilterBar
        instructors={instructors}
        filters={filters}
        onChange={handleFilterChange}
        onClear={handleClearFilters}
      />

      {hasActiveFilters && (
        <div className="mb-4 flex items-center justify-between text-sm text-gray-500">
          <span>Filtros activos</span>
          <button
            type="button"
            onClick={handleClearFilters}
            className="text-brand-primary hover:underline"
          >
            Limpiar todo
          </button>
        </div>
      )}

      {error && (
        <div id="classes-error" className="mb-6 rounded-md bg-red-50 p-4 text-sm text-red-600">
          {error}
        </div>
      )}

      {loading ? (
        <div id="classes-loading" className="flex items-center justify-center py-12 text-gray-500">
          Cargando clases...
        </div>
      ) : (
        <ClassesCalendar classes={classes} />
      )}
    </div>
  );
}