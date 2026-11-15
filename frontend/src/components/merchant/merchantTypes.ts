import type { MerchantProduct, MerchantStore } from "../../lib/api";

export type MerchantStoreDraft = {
  name: string;
  slug: string;
  category: string[];
  description: string;
  address: string;
  latitude: string;
  longitude: string;
  logoUrl: string;
};

export type MerchantProductDraft = Pick<
  MerchantProduct,
  "name" | "description" | "price" | "category" | "minOrderQty"
>;

export const STORE_CATEGORIES = [
  "Imóveis", "Eletrónicos", "Automóveis", "Agricultura", "Materiais de Construção",
  "Moda & Vestuário", "Alimentação & Bebidas", "Saúde & Beleza", "Casa & Decoração", "Diversos"
];

export function toMerchantStoreDraft(store: MerchantStore): MerchantStoreDraft {
  return {
    name: store.name,
    slug: store.slug,
    category: store.category,
    description: store.description,
    address: store.address,
    latitude: store.latitude == null ? "" : String(store.latitude),
    longitude: store.longitude == null ? "" : String(store.longitude),
    logoUrl: store.logoUrl ?? ""
  };
}

export function formatMerchantMoney(value: string) {
  const amount = Number(value);
  const formatted = Number.isFinite(amount)
    ? amount.toLocaleString("pt-MZ", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : value;
  return `${formatted} MT`;
}