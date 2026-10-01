import type { PackageCatalogItem } from "../types/Package";

export function formatCreditsLabel(credits: number): string {
  return credits === 1 ? "1 crédito" : `${credits} créditos`;
}

export function formatValidityChip(pkg: PackageCatalogItem): string {
  return pkg.validDays === null ? pkg.validityLabel : `Vigencia ${pkg.validityLabel}`;
}
