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

function normalizeStoreCategories(category: unknown): string[] {
  if (Array.isArray(category)) {
    return category.filter((item): item is string => typeof item === "string");
  }
  if (typeof category !== "string" || !category.trim()) return [];

  let value = category.trim();
  if (value.startsWith("[") && value.endsWith("]")) {
    try {
      const parsed: unknown = JSON.parse(value);
      if (Array.isArray(parsed)) {
        return parsed.filter((item): item is string => typeof item === "string");
      }
    } catch {
      // Continue parsing the PostgreSQL array format.
    }
  }

  if (value.startsWith("{") && value.endsWith("}")) {
    value = value.slice(1, -1);
  }
  return value
    .split(/,(?=(?:[^"]*"[^"]*")*[^"]*$)/)
    .map((item) => item.trim().replace(/^"(.*)"$/, "$1").replace(/\\"/g, '"').replace(/\\\\/g, "\\"))
    .filter(Boolean);
}

export async function loadNegotiations(session: Session): Promise<Negotiation[]> {
  const result = await api<{ negotiations: Negotiation[] }>("/negotiations", session);
  return result.negotiations;
}

export function registerProvider(session: Session, body: ProviderForm) {
  return api<{ provider: ServiceProvider }>("/providers/register", session, { method: "POST", body });
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