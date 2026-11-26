import { useState, type FormEvent } from "react";
import { FiCheckCircle, FiMapPin, FiNavigation, FiShoppingBag, FiTag } from "react-icons/fi";
import type { StoreForm } from "../../lib/types";
import { CHIMOIO_NEIGHBORHOODS } from "../../lib/chimoioNeighborhoods";
import { STORE_CATEGORIES } from "../merchant/merchantTypes";
import WorkspaceCard, { workspaceButtonClass, workspaceFieldClass, workspaceInputClass } from "./WorkspaceCard";

type StoreRegistrationFormProps = Readonly<{
  busy: boolean;
  onRegisterStore: (event: FormEvent<HTMLFormElement>, store: StoreForm & { neighborhood?: string }) => Promise<boolean>;
}>;

const initialStoreForm: StoreForm & { neighborhood?: string } = {
  name: "",
  slug: "",
  category: [],
  description: "",
  address: "",
  latitude: "-19.1164",
  longitude: "33.4833",
  neighborhood: ""
};

function generateSlug(text: string) {
  return text.toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export default function StoreRegistrationForm({ busy, onRegisterStore }: StoreRegistrationFormProps) {
  const [storeForm, setStoreForm] = useState(initialStoreForm);
  const [gpsEnabled, setGpsEnabled] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);

  function toggleStoreCategory(category: string) {
    setStoreForm((current) => ({
      ...current,
      category: current.category.includes(category)
        ? current.category.filter((item) => item !== category)
        : [...current.category, category]
    }));
  }

  function handleNeighborhoodChange(neighborhood: string) {
    const found = CHIMOIO_NEIGHBORHOODS.find((item) => item.name === neighborhood);
    setStoreForm((current) => ({
      ...current,
      neighborhood,
      address: neighborhood && neighborhood !== "Outro / Periferia de Chimoio"
        ? `Bairro ${neighborhood}`
        : current.address,
      latitude: found ? found.latitude.toFixed(6) : current.latitude,
      longitude: found ? found.longitude.toFixed(6) : current.longitude
    }));
  }

  function handleGetLocation() {
    setLocationError(null);
    if (!navigator.geolocation) {
      setLocationError("Este navegador não suporta localização GPS.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setStoreForm((current) => ({
          ...current,
          latitude: position.coords.latitude.toFixed(6),
          longitude: position.coords.longitude.toFixed(6)
        }));
        setGpsEnabled(true);
      },
      (error) => {
        console.warn("Acesso ao GPS recusado ou indisponível:", error.message);
        setLocationError("Não foi possível obter a localização. Verifique a permissão de GPS do navegador.");
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  return (
    <WorkspaceCard
      eyebrow="ABRIR NEGÓCIO · PRODUTOS"
      title="Registar uma loja em Chimoio"
      description="Preencha os dados principais para criar o perfil público da sua loja."
      icon={FiShoppingBag}
    >
      <form className="grid grid-cols-1 gap-4 min-[851px]:grid-cols-2" onSubmit={(event) => void onRegisterStore(event, storeForm)}>
        <label className={workspaceFieldClass}>
          Nome da loja ou negócio
          <input
            className={workspaceInputClass}
            required
            maxLength={160}
            placeholder="Ex.: Mercearia Central"
            value={storeForm.name}
            onChange={(event) => {
              const name = event.target.value;
              setStoreForm((current) => ({ ...current, name, slug: generateSlug(name) }));
            }}
          />
        </label>

        <div className="grid gap-2 min-[851px]:col-span-2">
          <p className="m-0 inline-flex items-center gap-2 text-xs font-bold text-[#506472]"><FiTag aria-hidden="true" /> Categorias dos produtos</p>
          <div className="grid grid-cols-1 gap-2 min-[561px]:grid-cols-2">
            {STORE_CATEGORIES.map((category) => (
              <label className="flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border border-[var(--line)] px-3 py-2 text-xs text-[#506472] transition hover:bg-[#f8fafb]" key={category}>
                <input
                  className="h-4 w-4 accent-[var(--navy)]"
                  type="checkbox"
                  checked={storeForm.category.includes(category)}
                  onChange={() => toggleStoreCategory(category)}
                />
                {category}
              </label>
            ))}
          </div>
        </div>

        <label className={workspaceFieldClass}>
          Bairro em Chimoio
          <select className={workspaceInputClass} required value={storeForm.neighborhood} onChange={(event) => handleNeighborhoodChange(event.target.value)}>
            <option value="">Escolha o bairro</option>
            {CHIMOIO_NEIGHBORHOODS.map((neighborhood) => <option key={neighborhood.name} value={neighborhood.name}>{neighborhood.name}</option>)}
          </select>
        </label>

        <label className={workspaceFieldClass}>
          Endereço ou ponto de referência
          <input
            className={workspaceInputClass}
            required
            placeholder="Ex.: próximo ao mercado central"
            value={storeForm.address}
            onChange={(event) => setStoreForm((current) => ({ ...current, address: event.target.value }))}
          />
        </label>

        <div className="grid gap-2 rounded-lg border border-[#d6eadf] bg-[#f1f8f4] p-3 min-[851px]:col-span-2 min-[561px]:grid-cols-[1fr_auto] min-[561px]:items-center">
          <p className="m-0 flex items-start gap-2 text-xs leading-relaxed text-[#2e715d]">
            <FiMapPin className="mt-0.5 flex-none" aria-hidden="true" />
            {gpsEnabled ? "Localização GPS adicionada ao perfil." : "O GPS é opcional e ajuda clientes a encontrar a sua loja no mapa."}
          </p>
          <button className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-[#b8d5c6] bg-white px-3 text-xs font-bold text-[#2e715d]" type="button" onClick={handleGetLocation}>
            <FiNavigation aria-hidden="true" /> {gpsEnabled ? "Atualizar GPS" : "Usar GPS"}
          </button>
          {locationError && <p className="m-0 text-xs text-red-700 min-[561px]:col-span-2" role="alert">{locationError}</p>}
        </div>

        <label className={`${workspaceFieldClass} min-[851px]:col-span-2`}>
          Descrição da loja
          <textarea
            className={`${workspaceInputClass} min-h-28 resize-y`}
            required
            maxLength={4000}
            placeholder="Conte o que vende, horários e opções de entrega."
            value={storeForm.description}
            onChange={(event) => setStoreForm((current) => ({ ...current, description: event.target.value }))}
          />
        </label>

        <button className={`${workspaceButtonClass} min-[851px]:col-span-2`} type="submit" disabled={busy}>
          <FiCheckCircle aria-hidden="true" /> {busy ? "A registar..." : "Registar e abrir loja"}
        </button>
      </form>
    </WorkspaceCard>
  );
}
