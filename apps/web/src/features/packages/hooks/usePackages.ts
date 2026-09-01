import { useCallback, useEffect, useState } from "react";
import { listActivePackages } from "../services/packagesService";
import type { PackageCatalogItem } from "../types/Package";

export function usePackages() {
  const [packages, setPackages] = useState<PackageCatalogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setPackages(await listActivePackages());
    } catch (err) {
      setError("No se pudieron cargar los paquetes.");
      console.error("[packages] listActivePackages fallo", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  return { packages, loading, error, reload };
}