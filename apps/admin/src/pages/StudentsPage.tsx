import { DependentsTable } from "@/features/dependents/components/DependentsTable";
import { useAllDependents } from "@/features/dependents/hooks/useAllDependents";

export function StudentsPage() {
  const { dependents, loading, error } = useAllDependents();

  return (
    <div id="students-page" className="mx-auto max-w-3xl p-6">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-brand-primary">Alumnos</h1>
      </div>

      {loading && <p className="text-sm text-gray-500">Cargando...</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}
      {!loading && !error && <DependentsTable dependents={dependents} showGuardianColumn />}
    </div>
  );
}
