export type Profile = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  avatarUrl?: string | null;
  role: "client" | "lojista" | "prestador" | "admin";
  store?: { category: string[] } | null;
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
};

export type MapStore = Pick<Store, "id" | "name" | "category" | "address" | "verified"> & {
  latitude: number | string | null;
  longitude: number | string | null;
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
  client_id: string;
  status: string;
  agreed_price: string | null;
  messages: Array<{
    id: string;
    sender_id: string;
    content: string;
    message_type: string;
    proposal_amount: string | null;
  }>;
};

export type Catalog = {
  stores: Store[];
  mapStores: MapStore[];
  products: Product[];
  providers: ServiceProvider[];
  services: Service[];
};

export type Notice = { text: string; error?: boolean } | null;

export type ProviderForm = { 
  category: string[]; 
  bio: string; 
  basePrice: string; 
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