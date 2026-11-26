export type Profile = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  avatarUrl?: string | null;
  ageGroup?: "18-24" | "25-34" | "35+" | null;
  neighborhood?: string | null;
  role: "client" | "lojista" | "prestador" | "admin";
  store?: { category: string[] } | null;
};

export type ProfileUpdate = {
  name: string;
  phone: string | null;
  avatarUrl: string | null;
  ageGroup: NonNullable<Profile["ageGroup"]> | null;
  neighborhood: string | null;
};

export type Store = {
  id: string;
  owner_id: string;
  name: string;
  slug: string;
  category: string[];
  description: string;
  address: string;
  latitude: number | null;
  longitude: number | null;
  verified: boolean;
  logo_url?: string | null;
};

export type MapStore = Pick<Store, "id" | "name" | "category" | "address" | "verified"> & {
  latitude: number | string | null;
  longitude: number | string | null;
  href?: string;
};

export type Product = {
  id: string;
  store_id: string;
  name: string;
  description: string;
  price: string;
  category: string;
  images: string[];
};

export type ServiceProvider = {
  id: string;
  user_id: string;
  category: string[];
  bio: string;
  base_price: string;
  neighborhood: string | null;
  verified: boolean;
  platform_member: boolean;
};

export type Service = {
  id: string;
  provider_id: string;
  title: string;
  description: string;
  category: string;
  price: string;
  delivery_time: string;
  images: string[];
  published: boolean;
  internal_platform_service: boolean;
};

export type Negotiation = {
  id: string;
  clientId: string;
  status: string;
  agreedPrice: string | null;
  client?: { id: string; name: string };
  provider?: { id: string; user?: { id: string; name: string } };
  service?: { id: string; title: string; price: string; images?: string[] };
  messages: Array<{
    id: string;
    senderId: string;
    content: string;
    messageType: string;
    proposalAmount: string | null;
    createdAt: string;
    sender?: { id: string; name: string };
  }>;
};

export type Catalog = {
  stores: Store[];
  mapStores: MapStore[];
  products: Product[];
  providers: ServiceProvider[];
  services: Service[];
  providerReviews: ProviderReview[];
};

export type ProviderReview = {
  target_id: string;
  rating: number;
  comment: string;
  created_at: string;
  reviewer_name: string | null;
  reviewer_avatar_url: string | null;
};

export type Notice = { text: string; error?: boolean } | null;

export type ProviderForm = {
  category: string[]; 
  bio: string; 
  basePrice: string; 
  neighborhood: string;
};

export type ServiceForm = { 
  title: string; 
  description: string; 
  price: string; 
  deliveryTime: string; 
};

export type ProviderServiceForm = {
  title: string;
  description: string;
  category: string;
  price: string;
  deliveryTime: string;
};

export type StoreForm = {
  name: string;
  slug: string;
  category: string[];
  description: string;
  address: string;
  latitude: string;
  longitude: string;
};

export type ProductForm = { 
  name: string; 
  description: string; 
  price: string; 
  category: string; 
};

export type AuthForm = { 
  email: string; 
  password: string; 
  confirmPassword?: string; 
  phone?: string; 
};

export type MessageForm = { 
  content: string; 
  proposalAmount: string; 
};