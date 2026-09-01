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

export type PackageCatalogItem = Package & {
  priceFormatted: string;
  validityLabel: string;
};