import { useCallback, useEffect, useState } from "react";
import {
  addAdminInvite,
  listAdminInvites,
  removeAdminInvite,
} from "../services/adminInvitesService";
import type { AdminInvite, AdminInviteRole } from "../types/AdminInvite";

export function useAdminInvites() {
  const [invites, setInvites] = useState<AdminInvite[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setInvites(await listAdminInvites());
    } catch (err) {
      setError("No se pudieron cargar las invitaciones.");
      console.error("[adminInvites] listAdminInvites fallo", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  async function add(email: string, role: AdminInviteRole) {
    await addAdminInvite(email, role);
    await reload();
  }

  async function remove(email: string) {
    await removeAdminInvite(email);
    await reload();
  }

  return { invites, loading, error, reload, add, remove };
}
