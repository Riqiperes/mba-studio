import { Link } from "react-router-dom";
import { BackButton } from "@/components/ui/BackButton";

const ESTUDIO_ITEMS = [
  { to: "/classes", label: "Clases", icon: "📅" },
  { to: "/instructors", label: "Instructores", icon: "🧑‍🏫" },
  { to: "/packages", label: "Paquetes", icon: "📦" },
  { to: "/customers", label: "Clientes", icon: "👥" },
];

export function EstudioHubPage() {
  return (
    <div id="estudio-hub-page" className="mx-auto max-w-3xl p-6">
      <BackButton />
      <h1 className="mb-6 text-xl font-semibold text-brand-primary">Estudio</h1>
      <div className="grid grid-cols-2 gap-4">
        {ESTUDIO_ITEMS.map((item) => (
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
    </div>
  );
}
