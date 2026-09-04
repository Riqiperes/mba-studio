import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/features/auth/hooks/AuthProvider";
import {
  createPackage,
  deletePackage,
  listPackages,
  setPackageActive,
  updatePackage,
} from "../services/packagesService";
import type { Package } from "../types/Package";

type PackageInput = {
  name: string;
  description?: string | null;
  credits: number;
  price: number;
  validDays?: number | null;
};

export function usePackages() {
  const { profile } = useAuth();
  const [packages, setPackages] = useState<Package[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setPackages(await listPackages());
    } catch (err) {
      setError("No se pudieron cargar los paquetes.");
      console.error("[packages] listPackages fallo", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  async function create(input: PackageInput) {
    if (!profile) throw new Error("Falta el perfil del usuario actual.");
    await createPackage(profile.businessId, input);
    await reload();
  }

  async function update(id: string, input: PackageInput) {
    await updatePackage(id, input);
    await reload();
  }

  async function setActive(id: string, active: boolean) {
    await setPackageActive(id, active);
    await reload();
  }

  async function remove(id: string) {
    await deletePackage(id);
    await reload();
  }

  return { packages, loading, error, reload, create, update, setActive, remove };
}
