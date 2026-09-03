import { useCallback, useEffect, useState } from "react";
import type { UserRole } from "@mba-studio/shared";
import { listBusinessUsers, updateUserRole } from "../services/usersService";
import type { BusinessUser } from "../types/User";

export function useUsers() {
  const [users, setUsers] = useState<BusinessUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setUsers(await listBusinessUsers());
    } catch (err) {
      setError("No se pudieron cargar los usuarios.");
      console.error("[users] listBusinessUsers fallo", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  async function setRole(profileId: string, role: UserRole, instructorId: string | null) {
    await updateUserRole(profileId, role, instructorId);
    await reload();
  }

  return { users, loading, error, reload, setRole };
}
