import { useState } from "react";
import { CustomerCreateModal } from "@/features/customers/components/CustomerCreateModal";
import { CustomersTable } from "@/features/customers/components/CustomersTable";
import { useCustomers } from "@/features/customers/hooks/useCustomers";
import { BackButton } from "@/components/ui/BackButton";

export function CustomersPage() {
  const { customers, loading, error, create } = useCustomers();
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <div id="customers-page" className="mx-auto max-w-3xl p-6">
      <BackButton />
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-brand-primary">Clientes</h1>
        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className="rounded-md bg-brand-primary px-4 py-2 text-sm font-medium text-white hover:opacity-90"
        >
          Nuevo cliente
        </button>
      </div>

      {loading && <p className="text-sm text-gray-500">Cargando...</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}
      {!loading && !error && <CustomersTable customers={customers} />}

      <CustomerCreateModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSubmit={create}
      />
    </div>
  );
}
