import { useEffect, useState, type FormEvent } from "react";
import { useParams } from "react-router-dom";
import { DependentFormModal, type DependentFormInput } from "@/features/dependents/components/DependentFormModal";
import { DependentsTable } from "@/features/dependents/components/DependentsTable";
import { useDependentsByGuardian } from "@/features/dependents/hooks/useDependents";
import { useCustomer } from "@/features/customers/hooks/useCustomers";
import type { Dependent } from "@/features/dependents/types/Dependent";
import { GrantCreditsModal } from "@/features/credits/components/GrantCreditsModal";
import { useCustomerCredits } from "@/features/credits/hooks/useCustomerCredits";
import { BackButton } from "@/components/ui/BackButton";
import { buttonClasses } from "@/components/ui/buttonStyles";
import { LoadingState } from "@/components/ui/LoadingState";
import { ErrorState } from "@/components/ui/ErrorState";

export function CustomerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const customerId = id ?? "";
  const { customer, loading, error, update } = useCustomer(customerId);
  const { dependents, loading: dependentsLoading, error: dependentsError, create, update: updateDependent, setActive } =
    useDependentsByGuardian(customerId, customer?.businessId ?? "");

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [discountPercent, setDiscountPercent] = useState("0");
  const [medicalConditions, setMedicalConditions] = useState("");
  const [notes, setNotes] = useState("");
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
    setDiscountPercent(String(customer.discountPercent));
    setMedicalConditions(customer.medicalConditions ?? "");
    setNotes(customer.notes ?? "");
  }, [customer]);

  async function handleSaveCustomer(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setEditError(null);

    if (!fullName.trim()) {
      setEditError("El nombre es obligatorio");
      return;
    }

    const discount = Number(discountPercent);
    if (!Number.isInteger(discount) || discount < 0 || discount > 100) {
      setEditError("El descuento debe ser un numero entero entre 0 y 100");
      return;
    }

    setIsSavingCustomer(true);
    try {
      await update({
        fullName,
        phone: phone || null,
        discountPercent: discount,
        medicalConditions: medicalConditions.trim() || null,
        notes: notes.trim() || null,
      });
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

  if (loading) return <LoadingState message="Cargando…" />;
  if (error || !customer) {
    return (
      <div className="mx-auto max-w-3xl p-4 text-cuerpo sm:p-6">
        <BackButton />
        <ErrorState message={error ?? "Cliente no encontrado."} />
      </div>
    );
  }

  return (
    <div id="customer-detail-page" className="mx-auto max-w-3xl p-4 sm:p-6">
      <BackButton />
      <p className="etiqueta mb-2">Estudio · Cliente</p>
      <h1 className="mb-4 font-display text-titulo font-medium text-texto">
        {customer.fullName ?? "Cliente"}
      </h1>

      <form onSubmit={handleSaveCustomer} noValidate className="mb-6 flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1">
          <label htmlFor="customer-fullname-input" className="etiqueta-campo">
            Nombre
          </label>
          <input
            id="customer-fullname-input"
            type="text"
            value={fullName}
            onChange={(event) => setFullName(event.target.value)}
            className="campo"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="customer-phone-input" className="etiqueta-campo">
            Telefono
          </label>
          <input
            id="customer-phone-input"
            type="text"
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            className="campo"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="customer-discount-input" className="etiqueta-campo">
            Descuento referido (%)
          </label>
          <input
            id="customer-discount-input"
            type="number"
            min={0}
            max={100}
            value={discountPercent}
            onChange={(event) => setDiscountPercent(event.target.value)}
            className="w-24 rounded-control border border-borde-control px-3 py-2 text-sm"
          />
        </div>
        <div className="flex w-full flex-col gap-1">
          <label htmlFor="customer-medical-conditions-input" className="etiqueta-campo">
            Condiciones medicas (opcional)
          </label>
          <textarea
            id="customer-medical-conditions-input"
            rows={2}
            placeholder="Embarazo, hernia, lesiones, etc."
            value={medicalConditions}
            onChange={(event) => setMedicalConditions(event.target.value)}
            className="campo"
          />
        </div>
        <div className="flex w-full flex-col gap-1">
          <label htmlFor="customer-notes-input" className="etiqueta-campo">
            Notas adicionales (opcional)
          </label>
          <textarea
            id="customer-notes-input"
            rows={2}
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            className="campo"
          />
        </div>
        <button
          type="submit"
          disabled={isSavingCustomer}
          className={buttonClasses("primary", "md")}
        >
          {isSavingCustomer ? "Guardando..." : "Guardar"}
        </button>
      </form>
      {editError && <p role="alert" className="mb-4 flex items-start gap-2 rounded-control bg-suave px-3 py-2 text-pequeno text-alerta">{editError}</p>}

      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-display text-subtitulo font-medium text-texto">Creditos</h2>
        <button
          type="button"
          onClick={() => setCreditsModalOpen(true)}
          className={buttonClasses("primary", "md")}
        >
          Otorgar creditos
        </button>
      </div>
      {creditsLoading && <p className="mb-6 text-sm text-texto-suave">Cargando...</p>}
      {creditsError && <p className="mb-6 text-sm text-alerta">{creditsError}</p>}
      {!creditsLoading && !creditsError && (
        <p className="mb-6 text-2xl font-semibold text-acento">{balance}</p>
      )}

      <GrantCreditsModal
        open={creditsModalOpen}
        onClose={() => setCreditsModalOpen(false)}
        onSubmit={handleGrantCredits}
      />

      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-display text-subtitulo font-medium text-texto">Alumnos</h2>
        <button
          type="button"
          onClick={openCreateDependent}
          className={buttonClasses("primary", "md")}
        >
          Nuevo alumno
        </button>
      </div>

      {dependentsLoading && <p role="status" className="text-pequeno text-texto-suave">Cargando…</p>}
      {dependentsError && <p role="alert" className="flex items-start gap-2 rounded-control bg-suave px-3 py-2 text-pequeno text-alerta">{dependentsError}</p>}
      {dependentActionError && <p role="alert" className="flex items-start gap-2 rounded-control bg-suave px-3 py-2 text-pequeno text-alerta">{dependentActionError}</p>}
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
        onToggleActive={
          editingDependent ? () => handleToggleDependentActive(editingDependent) : undefined
        }
      />
    </div>
  );
}
