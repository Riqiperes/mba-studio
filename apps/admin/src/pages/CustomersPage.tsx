import { useState } from "react";
import { CustomerCreateModal } from "@/features/customers/components/CustomerCreateModal";
import { CustomersTable } from "@/features/customers/components/CustomersTable";
import { useCustomers } from "@/features/customers/hooks/useCustomers";
import { BackButton } from "@/components/ui/BackButton";
import { buttonClasses } from "@/components/ui/buttonStyles";
import { Plus } from "lucide-react";
import { ScreenHeader } from "@/components/ui/ScreenHeader";

export function CustomersPage() {
  const { customers, loading, error, create } = useCustomers();
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <div id="customers-page" className="mx-auto max-w-3xl p-4 sm:p-6">
      <BackButton />
      <ScreenHeader
        eyebrow="Estudio"
        title="Clientes"
        actions={
          <button type="button" onClick={() => setModalOpen(true)} className={buttonClasses("primary", "md")}>
            <Plus className="h-[18px] w-[18px]" strokeWidth={1.8} aria-hidden="true" />
            Nuevo cliente
          </button>
        }
      />

      {loading && <p role="status" className="text-pequeno text-texto-suave">Cargando…</p>}
      {error && <p role="alert" className="flex items-start gap-2 rounded-control bg-suave px-3 py-2 text-pequeno text-alerta">{error}</p>}
      {!loading && !error && <CustomersTable customers={customers} />}

      <CustomerCreateModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSubmit={create}
      />
    </div>
  );
}
