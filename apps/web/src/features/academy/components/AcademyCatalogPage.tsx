import { useEffect, useState } from "react";
import { useAcademyGroups } from "@/features/academy/hooks/useAcademyGroups";
import { AcademyGroupCard } from "@/features/academy/components/AcademyGroupCard";
import { getBusiness } from "@/features/studio/services/businessService";
import { BackButton } from "@/components/ui/BackButton";
import { LoadingState } from "@/components/ui/LoadingState";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";

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
    <div id="academy-catalog-page" className="mx-auto max-w-[980px] px-4 py-6 sm:px-8 sm:py-8">
      <BackButton />

      {/* Presentacion: texto + foto con remate en arco (PROMPT.md) */}
      <header id="academy-intro-section" className="mb-10 grid items-center gap-6 sm:grid-cols-[1fr_280px] sm:gap-10">
        <div className="space-y-3">
          <p className="etiqueta">La Academia</p>
          <h1 className="font-display text-titulo font-medium sm:text-display-l">Academia de Ballet</h1>
          <p className="max-w-xl text-cuerpo-l text-texto-suave text-pretty">
            Consulta los grupos disponibles y sus horarios. Inscribe a tu hijo/a o agenda una clase muestra
            directamente aquí.
          </p>
        </div>
        <img
          src="/brand/piernas-barra.jpg"
          alt="Bailarinas en puntas junto a la barra"
          className="order-first mx-auto aspect-[4/5] w-44 rounded-[999px_999px_22px_22px] border border-borde object-cover shadow-card sm:order-none sm:w-full"
        />
      </header>

      {error && (
        <div className="mb-6">
          <ErrorState id="academy-error" message={error} />
        </div>
      )}

      {loading ? (
        <LoadingState id="academy-loading" message="Cargando grupos…" />
      ) : groups.length === 0 ? (
        !error && (
          <EmptyState
            id="academy-empty"
            title="Todavía no hay grupos de Academia disponibles"
            description="Vuelve pronto para ver los grupos y sus horarios."
          />
        )
      ) : (
        <section aria-labelledby="academy-groups-title" className="space-y-4">
          <h2 id="academy-groups-title" className="font-display text-subtitulo font-medium">
            Grupos
          </h2>
          <div id="academy-groups-grid" className="grid gap-4 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3">
            {groups.map((group) => (
              <AcademyGroupCard
                key={group.id}
                group={group}
                whatsappNumber={whatsappNumber}
                registrationFeeCents={registrationFeeCents}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
