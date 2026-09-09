import { Link } from "react-router-dom";
import { BackButton } from "@/components/ui/BackButton";
import { usePendingAcademyRequestsCount } from "@/features/academy/hooks/usePendingAcademyRequestsCount";

const ACADEMIA_ITEMS = [
  { to: "/academy/groups", label: "Ver horarios", icon: "📅" },
  { to: "/students", label: "Ver alumnos", icon: "🩰" },
];

export function AcademiaHubPage() {
  const { count: pendingCount } = usePendingAcademyRequestsCount();

  return (
    <div id="academia-hub-page" className="mx-auto max-w-3xl p-6">
      <BackButton />
      <h1 className="mb-2 text-xl font-semibold text-brand-primary">Academia</h1>
      {pendingCount > 0 && (
        <p className="mb-4 text-sm font-medium text-red-600">
          {pendingCount} solicitud{pendingCount === 1 ? "" : "es"} nueva{pendingCount === 1 ? "" : "s"} sin
          atender — revisa "Ver horarios" y entra al grupo correspondiente.
        </p>
      )}
      <div className="grid grid-cols-2 gap-4">
        {ACADEMIA_ITEMS.map((item) => (
          <Link
            key={item.to}
            to={item.to}
            className="flex flex-col items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white p-8 text-center shadow-sm hover:border-brand-primary hover:shadow-md"
          >
            <span className="text-4xl">{item.icon}</span>
            <span className="text-base font-medium text-brand-primary">{item.label}</span>
          </Link>
        ))}
      </div>
      <Link to="/academy/overdue" className="mt-4 inline-block text-sm text-gray-500 hover:underline">
        Ver colegiaturas atrasadas →
      </Link>
    </div>
  );
}
