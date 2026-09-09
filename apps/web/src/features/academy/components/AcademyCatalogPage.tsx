import { useEffect, useState } from "react";
import { useAcademyGroups } from "@/features/academy/hooks/useAcademyGroups";
import { AcademyGroupCard } from "@/features/academy/components/AcademyGroupCard";
import { getBusiness } from "@/features/studio/services/businessService";
import { BackButton } from "@/components/ui/BackButton";

export function AcademyCatalogPage() {
  const { groups, loading, error } = useAcademyGroups();
  const [whatsappNumber, setWhatsappNumber] = useState<string | null>(null);
  const [registrationFeeCents, setRegistrationFeeCents] = useState<number | null>(null);

  useEffect(() => {
    getBusiness().then((business) => {
      setWhatsappNumber(business?.whatsappNumber ?? null);
      setRegistrationFeeCents(business?.academyRegistrationFeeCents ?? null);
    });
  }, []);

  return (
    <div id="academy-catalog-page" className="mx-auto max-w-5xl p-6">
      <BackButton />
      <header className="mb-8">
        <h1 className="text-2xl font-semibold text-brand-primary">Academia de Ballet</h1>
        <p className="mt-1 text-gray-600">
          Consulta los grupos disponibles y sus horarios. Inscribe a tu hijo/a o agenda una clase
          muestra directamente aquí.
        </p>
      </header>

      {error && (
        <div id="academy-error" className="mb-6 rounded-md bg-red-50 p-4 text-sm text-red-600">
          {error}
        </div>
      )}

      {loading ? (
        <div id="academy-loading" className="flex items-center justify-center py-12 text-gray-500">
          Cargando grupos...
        </div>
      ) : groups.length === 0 ? (
        <div id="academy-empty" className="text-center py-12 text-gray-500">
          <p>Todavía no hay grupos de Academia disponibles.</p>
        </div>
      ) : (
        <div id="academy-groups-grid" className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {groups.map((group) => (
            <AcademyGroupCard
              key={group.id}
              group={group}
              whatsappNumber={whatsappNumber}
              registrationFeeCents={registrationFeeCents}
            />
          ))}
        </div>
      )}
    </div>
  );
}
