/**
 * Forma en camelCase de una fila de `packages` (ver
 * supabase/migrations/005_packages.sql). El mapeo snake_case ->
 * camelCase, y la conversion pesos <-> centavos, viven en
 * features/packages/services/packagesService.ts.
 */
export type Package = {
  id: string;
  businessId: string;
  name: string;
  description: string | null;
  credits: number;
  priceCents: number;
  currency: string;
  validDays: number | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
};
