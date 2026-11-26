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
  ProfileUpdate,
  ProviderForm,
  ProviderReview,
  Service,
  ServiceProvider,
  Store,
  StoreForm
} from "./types";

// O catálogo público usa Supabase; operações autenticadas passam pelo Express.
function normalizeImageList(images: unknown): string[] {
  if (Array.isArray(images)) return images.filter((image): image is string => typeof image === "string" && image.trim().length > 0);
  if (typeof images !== "string" || !images.trim()) return [];

  try {
    const parsed: unknown = JSON.parse(images);
    return Array.isArray(parsed)
      ? parsed.filter((image): image is string => typeof image === "string" && image.trim().length > 0)
      : [];
  } catch (error) {
    if (error instanceof SyntaxError) return [];
    throw error;
  }
}

export async function loadCatalog(): Promise<Catalog> {
  if (!supabase) {
    throw new Error("Configure VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY no frontend/.env.local.");
  }
  const client = supabase;

  const [storeResults, productResults, providerResults, serviceResults, providerReviewResults, mapStores] = await Promise.all([
    client.from("stores").select("*").order("created_at", { ascending: false }),
    client.from("products").select("*").order("created_at", { ascending: false }),
    client.from("service_providers").select("*").order("created_at", { ascending: false }),
    client.from("services").select("*").eq("published", true).order("created_at", { ascending: false }),
    client.from("public_reviews")
      .select("target_id,rating,comment,created_at,reviewer_name,reviewer_avatar_url")
      .eq("target_type", "service_provider")
      .order("created_at", { ascending: false }),
    loadAllMapStores(async (offset, limit) => {
      const result = await client
        .from("map_stores")
        .select("id,name,category,address,latitude,longitude,verified")
        .order("id", { ascending: true })
        .range(offset, offset + limit - 1);
      return { data: result.data as MapStore[] | null, error: result.error };
    })
  ]);
  const failed = [storeResults, productResults, providerResults, serviceResults, providerReviewResults]
    .find((result) => result.error);
  if (failed?.error) throw failed.error;

  return {
    stores: (storeResults.data ?? []) as Store[],
    mapStores,
    products: ((productResults.data ?? []) as Product[]).map((product) => ({
      ...product,
      images: normalizeImageList(product.images)
    })),
    providers: (providerResults.data ?? []) as ServiceProvider[],
    services: (serviceResults.data ?? []) as Service[],
    providerReviews: (providerReviewResults.data ?? []) as ProviderReview[]
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

export function updateProfile(session: Session, body: ProfileUpdate) {
  return api<Pick<Profile, "id" | "name" | "email" | "phone" | "avatarUrl" | "ageGroup" | "neighborhood" | "role">>(
    "/profile/me",
    session,
    { method: "PATCH", body }
  );
}

export async function createReview(session: Session, submission: ReviewSubmission) {
  const { image, ...body } = submission;
  let imageUrl: string | null = null;
  let imagePath: string | null = null;
  if (image) {
    if (!supabase) throw new Error("O serviço de fotografias está temporariamente indisponível.");
    const extensionByType: Record<string, string> = {
      "image/jpeg": "jpg",
      "image/png": "png",
      "image/webp": "webp"
    };
    const extension = extensionByType[image.type];
    if (!extension || image.size > 5 * 1024 * 1024) {
      throw new Error("A fotografia deve ser JPEG, PNG ou WebP e ter até 5 MB.");
    }

    imagePath = `${session.user.id}/reviews/${crypto.randomUUID()}.${extension}`;
    const { error: uploadError } = await supabase.storage
      .from("review-images")
      .upload(imagePath, image, { cacheControl: "3600", contentType: image.type, upsert: false });
    if (uploadError) throw uploadError;
    imageUrl = supabase.storage.from("review-images").getPublicUrl(imagePath).data.publicUrl;
  }

  try {
    return await api<{ review: PublicReview }>("/reviews", session, {
      method: "POST",
      body: { ...body, imageUrl }
    });
  } catch (error) {
    if (imagePath && supabase) {
      const { error: cleanupError } = await supabase.storage.from("review-images").remove([imagePath]);
      if (cleanupError) {
        throw new Error(`${(error as Error).message} A fotografia carregada não pôde ser removida.`, { cause: error });
      }
    }
    throw error;
  }
}

export function verifyStore(session: Session, storeId: string) {
  return api<{ store: { id: string; verified: boolean } }>(
    `/admin/stores/${encodeURIComponent(storeId)}/verify`,
    session,
    { method: "POST", body: {} }
  );
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
  neighborhood: string | null;
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
  neighborhood: string;
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

export type ReviewPayload = {
  targetType: "store" | "service_provider";
  targetId: string;
  rating: number;
  comment: string;
  imageUrl?: string | null;
};

export type ReviewSubmission = Omit<ReviewPayload, "imageUrl"> & {
  image: File | null;
};

export type PublicReview = {
  id: string;
  rating: number;
  comment: string;
  imageUrl: string | null;
  createdAt: string;
  client: { name: string | null; avatarUrl: string | null } | null;
};

export type PublicStoreDetail = {
  store: MerchantStore;
  products: MerchantProduct[];
  reviews: PublicReview[];
};

export type PublicProductDetail = {
  product: MerchantProduct;
  store: MerchantStore;
};

export type PublicProviderDetail = {
  provider: ProviderAccount;
  profile: { id: string; name: string; avatarUrl: string | null } | null;
  services: ProviderService[];
  reviews: PublicReview[];
};

export type StoreConversationMessage = {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  createdAt: string;
  sender?: { id: string; name: string; avatarUrl: string | null };
};

export type StoreConversation = {
  id: string;
  storeId: string;
  clientId: string;
  productId: string | null;
  createdAt: string;
  store: Pick<MerchantStore, "id" | "name" | "slug" | "logoUrl">;
  client?: { id: string; name: string; avatarUrl: string | null };
  product: { id: string; name: string; images: string[] } | null;
  messages: StoreConversationMessage[];
};

export async function loadPublicStore(slug: string): Promise<PublicStoreDetail> {
  const result = await api<PublicStoreDetail>(`/public/stores/${encodeURIComponent(slug)}`);
  return {
    ...result,
    store: { ...result.store, category: normalizeStoreCategories(result.store.category) },
    products: result.products.map((product) => ({ ...product, images: normalizeImageList(product.images) }))
  };
}

export async function loadPublicProduct(productId: string): Promise<PublicProductDetail> {
  const result = await api<PublicProductDetail>(`/public/products/${encodeURIComponent(productId)}`);
  return { ...result, product: { ...result.product, images: normalizeImageList(result.product.images) } };
}

export async function loadPublicProvider(providerId: string): Promise<PublicProviderDetail> {
  return api<PublicProviderDetail>(`/public/providers/${encodeURIComponent(providerId)}`);
}

export async function startStoreConversation(session: Session, body: { storeId: string; productId?: string; content: string }) {
  return api<{ conversation: StoreConversation; message: StoreConversationMessage }>("/store-conversations", session, { method: "POST", body });
}

export async function loadStoreConversations(session: Session): Promise<StoreConversation[]> {
  const result = await api<{ conversations: StoreConversation[] }>("/store-conversations", session);
  return result.conversations.map((conversation) => ({
    ...conversation,
    product: conversation.product
      ? { ...conversation.product, images: normalizeImageList(conversation.product.images) }
      : null
  }));
}

export async function loadStoreMessages(session: Session, conversationId: string): Promise<StoreConversationMessage[]> {
  const result = await api<{ messages: StoreConversationMessage[] }>(
    `/store-conversations/${encodeURIComponent(conversationId)}/messages`,
    session
  );
  return result.messages;
}

export function sendStoreMessage(session: Session, conversationId: string, content: string) {
  return api<{ message: StoreConversationMessage }>(
    `/store-conversations/${encodeURIComponent(conversationId)}/messages`,
    session,
    { method: "POST", body: { content } }
  );
}

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
  return result.products.map((product) => ({ ...product, images: normalizeImageList(product.images) }));
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
  return result.negotiations.map((negotiation) => ({
    ...negotiation,
    service: negotiation.service
      ? { ...negotiation.service, images: normalizeImageList(negotiation.service.images) }
      : undefined
  }));
}

export function registerProvider(session: Session, body: ProviderForm) {
  return api<{ provider: ProviderAccount }>("/providers/register", session, { method: "POST", body });
}

export function publishService(session: Session, body: ProviderServicePayload) {
  return api<{ service: ProviderService }>("/services", session, { method: "POST", body });
}

export function registerStore(session: Session, body: StoreForm) {
  return api<{ store: Store }>("/stores/register", session, { method: "POST", body });
}

export function createProduct(session: Session, body: ProductForm & { image?: string; images?: string[] }) {
  return api<{ product: Product }>("/products", session, { method: "POST", body });
}

export function updateProductPrice(session: Session, productId: string, price: number) {
  return api<{ product: Product }>(`/products/${encodeURIComponent(productId)}/price`, session, { method: "PATCH", body: { price } });
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

export async function api<T>(path: string, session?: Session, options: { method?: string; body?: unknown } = {}): Promise<T> {
  const apiServer = import.meta.env.VITE_API_URL?.replace(/\/+$/, "") ?? "";
  const response = await fetch(`${apiServer}/api${path}`, {
    method: options.method ?? "GET",
    headers: {
      ...(session ? { authorization: `Bearer ${session.access_token}` } : {}),
      ...(options.body === undefined ? {} : { "content-type": "application/json" })
    },
    ...(options.body === undefined ? {} : { body: JSON.stringify(options.body) })
  });
  const responseBody = await response.text();
  let result: { success?: boolean; data?: T; message?: string; error_code?: string } | undefined;
  if (responseBody.trim()) {
    try {
      result = JSON.parse(responseBody) as typeof result;
    } catch (error) {
      if (!(error instanceof SyntaxError)) throw error;
      if (!response.ok) throw new Error(`Pedido falhou (${response.status}).`);
      throw new Error("A API devolveu uma resposta inválida.");
    }
  }
  if (!response.ok) throw new Error(result?.message ?? `Pedido falhou (${response.status}).`);
  if (!result?.success || result.data === undefined) throw new Error("A API devolveu uma resposta inválida.");
  return result.data;
}
//frontend/src/lib/api.ts