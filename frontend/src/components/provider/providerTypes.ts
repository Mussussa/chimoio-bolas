import type { ProviderService } from "../../lib/api";
import type { ProviderServiceForm } from "../../lib/types";

export type ProviderProfileDraft = {
  name: string;
  bio: string;
  category: string[];
  basePrice: string;
};

export const PROVIDER_CATEGORIES = [
  "Construção", "Eletricidade", "Hidráulica", "Carpintaria & Serralharia",
  "Transporte & Logística", "Hotelaria & Restauração", "Tecnologia & Informática",
  "Beleza & Estética", "Limpeza & Jardinagem", "Diversos"
];

export const EMPTY_PROVIDER_SERVICE_FORM: ProviderServiceForm = {
  title: "",
  description: "",
  category: "",
  price: "",
  deliveryTime: ""
};

export function toProviderServiceForm(service: ProviderService): ProviderServiceForm {
  return {
    title: service.title,
    description: service.description,
    category: service.category,
    price: service.price,
    deliveryTime: service.deliveryTime
  };
}