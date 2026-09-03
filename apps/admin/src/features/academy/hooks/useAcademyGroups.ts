import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/features/auth/hooks/AuthProvider";
import { createGroup, listGroups, updateGroup } from "../services/academyGroupsService";
import type { AcademyGroup, AcademyGroupWithDetails, GroupInput } from "../types/AcademyGroup";

export function useAcademyGroups() {
  const { profile } = useAuth();
  const [groups, setGroups] = useState<AcademyGroupWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setGroups(await listGroups());
    } catch (err) {
      setError("No se pudieron cargar los grupos.");
      console.error("[academy] listGroups fallo", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  async function create(input: GroupInput): Promise<AcademyGroup> {
    if (!profile) throw new Error("Falta el perfil del usuario actual.");
    const group = await createGroup(profile.businessId, input);
    await reload();
    return group;
  }

  async function update(id: string, input: GroupInput): Promise<AcademyGroup> {
    if (!profile) throw new Error("Falta el perfil del usuario actual.");
    const group = await updateGroup(id, profile.businessId, input);
    await reload();
    return group;
  }

  return { groups, loading, error, reload, create, update };
}
