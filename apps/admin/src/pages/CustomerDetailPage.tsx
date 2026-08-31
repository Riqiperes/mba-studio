import { useEffect, useState, type FormEvent } from "react";
import { useParams } from "react-router-dom";
import { DependentFormModal, type DependentFormInput } from "@/features/dependents/components/DependentFormModal";
import { DependentsTable } from "@/features/dependents/components/DependentsTable";
import { useDependentsByGuardian } from "@/features/dependents/hooks/useDependents";
import { useCustomer } from "@/features/customers/hooks/useCustomers";
import type { Dependent } from "@/features/dependents/types/Dependent";
import { GrantCreditsModal } from "@/features/credits/components/GrantCreditsModal";
import { useCustomerCredits } from "@/features/credits/hooks/useCustomerCredits";

export function CustomerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const customerId = id ?? "";
  const { customer, loading, error, update } = useCustomer(customerId);
  const { dependents, loading: dependentsLoading, error: dependentsError, create, update: updateDependent, setActive } =
    useDependentsByGuardian(customerId, customer?.businessId ?? "");

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [editError, setEditError] = useState<string | null>(null);
  const [isSavingCustomer, setIsSavingCustomer] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingDependent, setEditingDependent] = useState<Dependent | null>(null);
  const [dependentActionError, setDependentActionError] = useState<string | null>(null);

  const { balance, loading: creditsLoading, error: creditsError, grant } = useCustomerCredits(customerId);
  const [creditsModalOpen, setCreditsModalOpen] = useState(false);

  async function handleGrantCredits(amount: number, notes?: string | null) {
    await grant(amount, notes);
  }

  useEffect(() => {
    if (!customer) return;
    setFullName(customer.fullName ?? "");
    setPhone(customer.phone ?? "");
  }, [customer]);

  async function handleSaveCustomer(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setEditError(null);

    if (!fullName.trim()) {
      setEditError("El nombre es obligatorio");
      return;
    }

    setIsSavingCustomer(true);
    try {
      await update({ fullName, phone: phone || null });
    } catch (err) {
      setEditError("No se pudo actualizar el cliente. Intenta de nuevo.");
      console.error("[customers] update fallo", err);
    } finally {
      setIsSavingCustomer(false);
    }
  }

  function openCreateDependent() {
    setEditingDependent(null);
    setModalOpen(true);
  }

  function openEditDependent(dependent: Dependent) {
    setEditingDependent(dependent);
    setModalOpen(true);
  }

  async function handleDependentSubmit(input: DependentFormInput) {
    if (editingDependent) {
      await updateDependent(editingDependent.id, {
        fullName: input.fullName,
        birthDate: input.birthDate ?? null,
      });
    } else {
      await create({
        fullName: input.fullName,
        birthDate: input.birthDate ?? null,
      });
    }
  }

  async function handleToggleDependentActive(dependent: Dependent) {
    if (dependent.active && !window.confirm(`Desactivar al alumno "${dependent.fullName}"?`)) {
      return;
    }
    setDependentActionError(null);
    try {
      await setActive(dependent.id, !dependent.active);
    } catch (err) {
      setDependentActionError("No se pudo actualizar el alumno. Intenta de nuevo.");
      console.error("[dependents] setActive fallo", err);
    }
  }

  if (loading) return <div className="mx-auto max-w-3xl p-6 text-sm text-gray-500">Cargando...</div>;
  if (error || !customer) {
    return <div className="mx-auto max-w-3xl p-6 text-sm text-red-600">{error ?? "Cliente no encontrado."}</div>;
  }

  return (
    <div id="customer-detail-page" className="mx-auto max-w-3xl p-6">
      <h1 className="mb-4 text-xl font-semibold text-brand-primary">
        {customer.fullName ?? "Cliente"}
      </h1>

      <form onSubmit={handleSaveCustomer} noValidate className="mb-6 flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1">
          <label htmlFor="customer-fullname-input" className="text-xs text-gray-500">
            Nombre
          </label>
          <input
            id="customer-fullname-input"
            type="text"
            value={fullName}
            onChange={(event) => setFullName(event.target.value)}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="customer-phone-input" className="text-xs text-gray-500">
            Telefono
          </label>
          <input
            id="customer-phone-input"
            type="text"
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
        </div>
        <button
          type="submit"
          disabled={isSavingCustomer}
          className="rounded-md bg-brand-primary px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
        >
          {isSavingCustomer ? "Guardando..." : "Guardar"}
        </button>
      </form>
      {editError && <p className="mb-4 text-sm text-red-600">{editError}</p>}

      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-brand-primary">Creditos</h2>
        <button
          type="button"
          onClick={() => setCreditsModalOpen(true)}
          className="rounded-md bg-brand-primary px-4 py-2 text-sm font-medium text-white hover:opacity-90"
        >
          Otorgar creditos
        </button>
      </div>
      {creditsLoading && <p className="mb-6 text-sm text-gray-500">Cargando...</p>}
      {creditsError && <p className="mb-6 text-sm text-red-600">{creditsError}</p>}
      {!creditsLoading && !creditsError && (
        <p className="mb-6 text-2xl font-semibold text-brand-primary">{balance}</p>
      )}

      <GrantCreditsModal
        open={creditsModalOpen}
        onClose={() => setCreditsModalOpen(false)}
        onSubmit={handleGrantCredits}
      />

      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-brand-primary">Alumnos</h2>
        <button
          type="button"
          onClick={openCreateDependent}
          className="rounded-md bg-brand-primary px-4 py-2 text-sm font-medium text-white hover:opacity-90"
        >
          Nuevo alumno
        </button>
      </div>

      {dependentsLoading && <p className="text-sm text-gray-500">Cargando...</p>}
      {dependentsError && <p className="text-sm text-red-600">{dependentsError}</p>}
      {dependentActionError && <p className="text-sm text-red-600">{dependentActionError}</p>}
      {!dependentsLoading && !dependentsError && (
        <DependentsTable
          dependents={dependents}
          onEdit={openEditDependent}
          onToggleActive={handleToggleDependentActive}
        />
      )}

      <DependentFormModal
        open={modalOpen}
        initialValue={editingDependent}
        showGuardianFields={false}
        onClose={() => setModalOpen(false)}
        onSubmit={handleDependentSubmit}
      />
    </div>
  );
}
