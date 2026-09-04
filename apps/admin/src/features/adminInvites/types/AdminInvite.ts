import type { UserRole } from "@mba-studio/shared";

/**
 * Fila de `admin_allowed_emails`, devuelta por la RPC `list_admin_invites()`
 * (ver supabase/migrations/024_admin_invites_rpc.sql). `registered` indica
 * si ese correo ya se registro (existe en auth.users) -- en ese caso el rol
 * real ya vive en `profiles` y se cambia desde /users, no aqui.
 */
export type AdminInvite = {
  email: string;
  role: UserRole;
  createdAt: string;
  registered: boolean;
};

export type AdminInviteRole = Extract<UserRole, "STAFF" | "BUSINESS_ADMIN" | "SUPER_ADMIN">;
