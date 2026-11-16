import type { Session } from "@supabase/supabase-js";
import { supabase } from "./supabase";
import { loadAllMapStores } from "./mapStores";
import type {
  Catalog,
  MapStore,
  Negotiation,
  Product,
  ProductForm,
  Profile,
  ProviderForm,
  Service,
  ServiceForm,
  ServiceProvider,
  Store,
  StoreForm
} from "./types";

// O catálogo público usa Supabase; operações autenticadas passam pelo Express.
export async function loadCatalog(): Promise<Catalog> {
  if (!supabase) {
    throw new Error("Configure VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY no frontend/.env.local.");
  }
  const client = supabase;

  const [storeResults, productResults, providerResults, serviceResults, mapStores] = await Promise.all([
    client.from("stores").select("*").order("created_at", { ascending: false }),
    client.from("products").select("*").order("created_at", { ascending: false }),
    client.from("service_providers").select("*").order("created_at", { ascending: false }),
    client.from("services").select("*").eq("published", true).order("created_at", { ascending: false }),
    loadAllMapStores(async (offset, limit) => {
      const result = await client
        .from("map_stores")
        .select("id,name,category,address,latitude,longitude,verified")
        .order("id", { ascending: true })
        .range(offset, offset + limit - 1);
      return { data: result.data as MapStore[] | null, error: result.error };
    })
  ]);
  const failed = [storeResults, productResults, providerResults, serviceResults].find((result) => result.error);
  if (failed?.error) throw failed.error;

  return {
    stores: (storeResults.data ?? []) as Store[],
    mapStores,
    products: (productResults.data ?? []) as Product[],
    providers: (providerResults.data ?? []) as ServiceProvider[],
    services: (serviceResults.data ?? []) as Service[]
  };
}

export async function loadProfile(session: Session): Promise<Profile> {
  const profile = await api<Omit<Profile, "store"> & { store?: { category?: unknown } | null }>("/profile/me", session);
  return {
    ...profile,
    store: profile.store
      ? { category: normalizeStoreCategories(profile.store.category) }
      : profile.store
  };
}

export type MerchantStore = {
  id: string;
  ownerId: string;
  name: string;
  slug: string;
  category: string[];
  description: string;
  address: string;
  latitude: number | string | null;
  longitude: number | string | null;
  logoUrl: string | null;
  verified: boolean;
};

export type MerchantProduct = {
  id: string;
  storeId: string;
  name: string;
  description: string;
  price: string;
  category: string;
  images: string[];
  minOrderQty: number;
};

export type ProviderService = {
  id: string;
  providerId: string;
  title: string;
  description: string;
  category: string;
  price: string;
  deliveryTime: string;
  images: string[];
  published: boolean;
  internalPlatformService: boolean;
  createdAt: string;
};

export type ProviderAccount = {
  id: string;
  userId: string;
  category: string[];
  bio: string;
  basePrice: string;
  verified: boolean;
  platformMember: boolean;
  createdAt: string;
};

export type ProviderDashboardData = {
  provider: ProviderAccount;
  services: ProviderService[];
  profile: { id: string; name: string; avatarUrl: string | null };
};

export type ProviderProfileUpdate = {
  name: string;
  category: string[];
  bio: string;
  basePrice: number;
  avatarUrl: string | null;
};

export type ProviderServicePayload = {
  title: string;
  description: string;
  category: string;
  price: number;
  deliveryTime: string;
  images: string[];
};

export async function loadMerchantStore(session: Session): Promise<MerchantStore> {
  const result = await api<{ store: Omit<MerchantStore, "category"> & { category: unknown } }>("/merchant/store/me", session);
  return { ...result.store, category: normalizeStoreCategories(result.store.category) };
}

export async function updateMerchantStore(session: Session, store: Omit<MerchantStore, "id" | "ownerId" | "verified">) {
  const result = await api<{
    store: Omit<MerchantStore, "category"> & { category: unknown };
  }>("/merchant/store/me", session, { method: "PUT", body: store });
  return { ...result, store: { ...result.store, category: normalizeStoreCategories(result.store.category) } };
}

export async function loadMerchantProducts(session: Session): Promise<MerchantProduct[]> {
  const result = await api<{ products: MerchantProduct[] }>("/merchant/products/me", session);
  return result.products;
}

export function updateMerchantProduct(session: Session, product: MerchantProduct) {
  return api<{ product: MerchantProduct }>(`/merchant/products/${encodeURIComponent(product.id)}`, session, {
    method: "PUT",
    body: {
      name: product.name,
      description: product.description,
      price: product.price,
      category: product.category,
      images: product.images,
      minOrderQty: product.minOrderQty
    }
  });
}

export function deleteMerchantProduct(session: Session, productId: string) {
  return api<null>(`/merchant/products/${encodeURIComponent(productId)}`, session, { method: "DELETE" });
}

export async function loadProviderDashboard(session: Session): Promise<ProviderDashboardData> {
  const result = await api<ProviderDashboardData>("/providers/me", session);
  return {
    ...result,
    provider: { ...result.provider, category: normalizeStoreCategories(result.provider.category) }
  };
}

export function updateProviderProfile(session: Session, body: ProviderProfileUpdate) {
  return api<Pick<ProviderDashboardData, "provider" | "profile">>("/providers/me", session, { method: "PUT", body });
}

export function publishProviderService(session: Session, body: ProviderServicePayload) {
  return api<{ service: ProviderService }>("/providers/me/services", session, { method: "POST", body });
}

export function updateProviderService(session: Session, serviceId: string, body: ProviderServicePayload) {
  return api<{ service: ProviderService }>(`/providers/me/services/${encodeURIComponent(serviceId)}`, session, { method: "PUT", body });
}

export function deleteProviderService(session: Session, serviceId: string) {
  return api<null>(`/providers/me/services/${encodeURIComponent(serviceId)}`, session, { method: "DELETE" });
}

function normalizeStoreCategories(category: unknown): string[] {
  if (Array.isArray(category)) {
    return category.filter((item): item is string => typeof item === "string");
  }
  if (typeof category !== "string" || !category.trim()) return [];

  const value = category.trim();
  const jsonCategories = parseJsonCategories(value);
  return jsonCategories ?? parsePostgresCategories(value);
}

function parseJsonCategories(value: string): string[] | null {
  if (!value.startsWith("[") || !value.endsWith("]")) return null;
  try {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed)
      ? parsed.filter((item): item is string => typeof item === "string")
      : null;
  } catch {
    return null;
  }
}

function parsePostgresCategories(value: string): string[] {
  const contents = value.startsWith("{") && value.endsWith("}")
    ? value.slice(1, -1)
    : value;
  const categories: string[] = [];
  let current = "";
  let quoted = false;
  let escaped = false;
  for (const character of contents) {
    if (escaped) {
      current += character;
      escaped = false;
    } else if (character === "\\") {
      escaped = true;
    } else if (character === '"') {
      quoted = !quoted;
    } else if (character === "," && !quoted) {
      if (current.trim()) categories.push(current.trim());
      current = "";
    } else {
      current += character;
    }
  }
  if (escaped) current += "\\";
  if (current.trim()) categories.push(current.trim());
  return categories;
}

export async function loadNegotiations(session: Session): Promise<Negotiation[]> {
  const result = await api<{ negotiations: Negotiation[] }>("/negotiations", session);
  return result.negotiations;
}

export function registerProvider(session: Session, body: ProviderForm) {
  return api<{ provider: ProviderAccount }>("/providers/register", session, { method: "POST", body });
}

export function publishService(session: Session, body: ServiceForm) {
  return api<{ service: Service }>("/services", session, { method: "POST", body });
}

export function registerStore(session: Session, body: StoreForm) {
  return api<{ store: Store }>("/stores/register", session, { method: "POST", body });
}

export function createProduct(session: Session, body: ProductForm & { image?: string; images?: string[] }) {
  return api("/products", session, { method: "POST", body });
}

export function updateProductPrice(session: Session, productId: string, price: number) {
  return api(`/products/${productId}/price`, session, { method: "PATCH", body: { price } });
}

export function startNegotiation(session: Session, serviceId: string) {
  return api<{ negotiation: Negotiation }>("/negotiations", session, { method: "POST", body: { serviceId } });
}

export function sendNegotiationMessage(
  session: Session,
  negotiationId: string,
  body: { content: string; messageType: "proposal" | "text"; proposalAmount?: number }
) {
  return api(`/negotiations/${negotiationId}/messages`, session, { method: "POST", body });
}

export function respondToProposal(session: Session, negotiationId: string, messageId: string, action: "accept" | "reject") {
  return api(`/negotiations/${negotiationId}/proposals/${messageId}/respond`, session, { method: "POST", body: { action } });
}

export function completeNegotiation(session: Session, negotiationId: string) {
  return api(`/negotiations/${negotiationId}/complete`, session, { method: "POST", body: {} });
}

export async function api<T>(path: string, session: Session, options: { method?: string; body?: unknown } = {}): Promise<T> {
  const response = await fetch(`/api${path}`, {
    method: options.method ?? "GET",
    headers: {
      authorization: `Bearer ${session.access_token}`,
      ...(options.body === undefined ? {} : { "content-type": "application/json" })
    },
    ...(options.body === undefined ? {} : { body: JSON.stringify(options.body) })
  });
  const result = await response.json() as { success?: boolean; data?: T; message?: string; error_code?: string };
  if (!response.ok) throw new Error(result.message ?? `Pedido falhou (${response.status}).`);
  if (!result.success || result.data === undefined) throw new Error("A API devolveu uma resposta inválida.");
  return result.data;
}
//frontend/src/lib/api.ts