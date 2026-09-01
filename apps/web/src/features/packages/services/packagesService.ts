import { supabase } from "@/lib/supabaseClient";
import type { Package, PackageCatalogItem } from "../types/Package";

const SELECT_COLUMNS =
  "id, business_id, name, description, credits, price_cents, currency, valid_days, active, created_at, updated_at";

type PackageRow = {
  id: string;
  business_id: string;
  name: string;
  description: string | null;
  credits: number;
  price_cents: number;
  currency: string;
  valid_days: number | null;
  active: boolean;
  created_at: string;
  updated_at: string;
};

function toPackage(row: PackageRow): Package {
  return {
    id: row.id,
    businessId: row.business_id,
    name: row.name,
    description: row.description,
    credits: row.credits,
    priceCents: row.price_cents,
    currency: row.currency,
    validDays: row.valid_days,
    active: row.active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function formatPrice(cents: number, currency: string): string {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

function formatValidity(validDays: number | null): string {
  if (validDays === null) return "Sin vencimiento";
  if (validDays === 1) return "1 día";
  return `${validDays} días`;
}

export async function listActivePackages(): Promise<PackageCatalogItem[]> {
  const { data, error } = await supabase
    .from("packages")
    .select(SELECT_COLUMNS)
    .eq("active", true)
    .order("price_cents", { ascending: true });

  if (error) throw error;

  return (data as PackageRow[]).map((row) => {
    const pkg = toPackage(row);
    return {
      ...pkg,
      priceFormatted: formatPrice(pkg.priceCents, pkg.currency),
      validityLabel: formatValidity(pkg.validDays),
    };
  });
}