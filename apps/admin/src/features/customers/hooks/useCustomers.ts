import { useCallback, useEffect, useState } from "react";
import { getCustomer, listCustomers, updateCustomer } from "../services/customersService";
import type { Customer } from "../types/Customer";

export function useCustomers() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setCustomers(await listCustomers());
    } catch (err) {
      setError("No se pudieron cargar los clientes.");
      console.error("[customers] listCustomers fallo", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  return { customers, loading, error, reload };
}

export function useCustomer(id: string) {
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setCustomer(await getCustomer(id));
    } catch (err) {
      setError("No se pudo cargar el cliente.");
      console.error("[customers] getCustomer fallo", err);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    reload();
  }, [reload]);

  async function update(input: { fullName?: string; phone?: string | null }) {
    setCustomer(await updateCustomer(id, input));
  }

  return { customer, loading, error, reload, update };
}
