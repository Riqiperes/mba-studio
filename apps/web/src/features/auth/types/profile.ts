import type { UserRole } from "@mba-studio/shared";

/**
 * Forma en camelCase de una fila de la tabla `profiles` (ver
 * supabase/migrations/002_profiles.sql). El mapeo snake_case -> camelCase
 * vive en features/auth/services/authService.ts.
 */
export type Profile = {
  id: string;
  businessId: string;
  role: UserRole;
  fullName: string | null;
  phone: string | null;
  createdAt: string;
  updatedAt: string;
};
