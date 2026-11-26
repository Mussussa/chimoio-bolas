import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { FiLogIn, FiMessageCircle } from "react-icons/fi";
import type { MapStore, Product, Profile, Service, ServiceProvider, Store } from "../lib/types";
import { providerServiceHref, storeProductHref } from "../lib/publicLinks";
import { DirectoryFilters } from "../components/marketplace/DirectoryControls";
import SharePageButton from "../components/marketplace/SharePageButton";
import MapExplorer from "../components/marketplace/LazyMapExplorer";
import CategoryImage from "../components/marketplace/CategoryImage";
import { CHIMOIO_NEIGHBORHOODS } from "../lib/chimoioNeighborhoods";
import { FALLBACK_IMAGE, SERVICE_CATEGORY_IMAGES, STORE_CATEGORY_IMAGES } from "../lib/categoryPlaceholders";

type DirectoryProps = Readonly<{
  query: string;
  onQueryChange: (value: string) => void;
  mapStores: MapStore[];
  gps: [number, number] | null;
  mapLoading: boolean;
  mapError: string | null;
  onLocate: () => void;
  onClearLocation: () => void;
}>;

type DirectoryMapProps = Readonly<{
  title: string;
  description: string;
  stores: MapStore[];
  gps: [number, number] | null;
  loading: boolean;
  error: string | null;
  entityLabel: string;
  categoryLabel: string;
  popupLinkLabel: string;
  emptyMessage: string;
  verificationLabels?: { verified: string; unverified: string };
  onLocate: () => void;
  onClearLocation: () => void;
}>;

function DirectoryMap({
  title,
  description,
  stores,
  gps,
  loading,
  error,
  entityLabel,
  categoryLabel,
  popupLinkLabel,
  emptyMessage,
  verificationLabels,
  onLocate,
  onClearLocation
}: DirectoryMapProps) {
  return (
    <section className="mt-10">
      <header className="mb-[18px] flex flex-col gap-[22px] min-[851px]:flex-row min-[851px]:items-end min-[851px]:justify-between">
        <div><p className="mb-1 text-[10px] font-extrabold tracking-[.17em] text-[#765900]">EXPLORAR NO MAPA</p><h2 className="my-[7px] font-[Manrope,sans-serif] text-[clamp(23px,3vw,32px)] font-extrabold tracking-[-.04em]">{title}</h2><p className="m-0 text-[13px] text-[#716e60]">{description}</p></div>
      </header>
      <MapExplorer
        stores={stores}
        gps={gps}
        loading={loading}
        error={error}
        onLocate={onLocate}
        onClearLocation={onClearLocation}
        entityLabel={entityLabel}
        categoryLabel={categoryLabel}
        popupLinkLabel={popupLinkLabel}
        emptyMessage={emptyMessage}
        verificationLabels={verificationLabels}
      />
    </section>
  );
}

type StoreConversationProps = Readonly<{
  profile: Profile | null;
  busy: boolean;
  onStartStoreConversation: (storeId: string, content: string, productId?: string) => Promise<string | null>;
}>;

export function ProductsDirectoryPage({
  products, stores, query, onQueryChange, profile, busy, onStartStoreConversation,
  mapStores, gps, mapLoading, mapError, onLocate, onClearLocation
}: DirectoryProps & StoreConversationProps & {
  products: Product[];
  stores: Store[];
}) {
  const [category, setCategory] = useState("");
  const navigate = useNavigate();
  const categories = useMemo(
    () => [...new Set(products.map((product) => product.category).filter(Boolean))].sort((a, b) => a.localeCompare(b, "pt-MZ")),
    [products]
  );
  const storesById = useMemo(() => new Map(stores.map((store) => [store.id, store])), [stores]);
  const filteredProducts = useMemo(() => {
    const term = query.trim().toLocaleLowerCase();
    return products.filter((product) => {
      const store = storesById.get(product.store_id);
      return (!category || product.category === category) &&
        (!term || `${product.name} ${product.description} ${product.category} ${store?.name ?? ""}`.toLocaleLowerCase().includes(term));
    });
  }, [category, products, query, storesById]);
  const productMapStores = useMemo(() => {
    const categoriesByStore = new Map<string, Set<string>>();
    for (const product of filteredProducts) {
      const categoriesForStore = categoriesByStore.get(product.store_id) ?? new Set<string>();
      categoriesForStore.add(product.category);
      categoriesByStore.set(product.store_id, categoriesForStore);
    }
    return mapStores.flatMap((mapStore) => {
      const productCategories = categoriesByStore.get(mapStore.id);
      if (!productCategories) return [];
      const store = storesById.get(mapStore.id);
      return [{
        ...mapStore,
        category: [...productCategories],
        href: store ? `/lojas/${encodeURIComponent(store.slug)}` : undefined
      }];
    });
  }, [filteredProducts, mapStores, storesById]);

  async function contactProduct(store: Store, product: Product) {
    const conversationId = await onStartStoreConversation(
      store.id,
      `Tenho interesse no produto ${product.name}.`,
      product.id
    );
    if (conversationId) await navigate(`/mensagens/lojas/${conversationId}`);
  }

  return (
    <section className="min-h-[65vh] px-[clamp(20px,7vw,100px)] py-[70px] max-[560px]:py-12">
      <div className="mb-[26px] flex flex-col gap-[22px] min-[851px]:flex-row min-[851px]:items-end min-[851px]:justify-between"><div><p className="mb-1 text-[10px] font-extrabold tracking-[.17em] text-[#765900]">CATÁLOGO LOCAL</p><h1 className="my-3 text-[clamp(28px,4vw,42px)] font-extrabold leading-tight tracking-[-.04em]">Produtos em Chimoio</h1><p className="m-0 text-[13px] text-[#716e60]">Pesquisa produtos e abre a loja directamente no produto escolhido.</p></div></div>
      <DirectoryFilters query={query} onQueryChange={onQueryChange} category={category} categories={categories} onCategoryChange={setCategory} searchLabel="Pesquisar produtos..." />
      <DirectoryMap
        title="Produtos no mapa"
        description="O mapa mostra apenas lojas com produtos encontrados nos filtros actuais."
        stores={productMapStores}
        gps={gps}
        loading={mapLoading}
        error={mapError}
        entityLabel="lojas"
        categoryLabel="Categoria do produto"
        popupLinkLabel="Ver loja e produtos"
        emptyMessage="Não há lojas com produtos localizadas para estes filtros."
        onLocate={onLocate}
        onClearLocation={onClearLocation}
      />
      {!filteredProducts.length ? <p className="col-span-full rounded-[10px] border border-dashed border-[#cbd8de] p-6 text-center text-[13px] text-[#716e60]">Não encontrámos produtos com estes filtros.</p> : (
        <div className="grid grid-cols-2 gap-3 min-[561px]:gap-[15px] min-[851px]:grid-cols-3">
          {filteredProducts.map((product) => {
            const store = storesById.get(product.store_id);
            const productHref = store ? storeProductHref(store.slug, product.id) : `/produtos/${encodeURIComponent(product.id)}`;
            const canContactStore = Boolean(
              store && profile && profile.role !== "admin" && store.owner_id !== profile.id
            );
            const shareText = store
              ? `${product.name} na loja ${store.name} · ${Number(product.price).toLocaleString("pt-MZ")} MT.`
              : `${product.name} · ${Number(product.price).toLocaleString("pt-MZ")} MT.`;
            return (
              <article className="min-h-[206px] rounded-xl border border-[#e7e1ca] bg-white p-3 shadow-[0_8px_18px_#16354a08] min-[561px]:p-[22px]" key={product.id}>
                <Link to={productHref}><CategoryImage className="my-3 block aspect-video w-full rounded-md bg-[#eef2f4] object-cover" src={product.images?.[0]} placeholder={STORE_CATEGORY_IMAGES[product.category] ?? FALLBACK_IMAGE} alt={product.name} /></Link>
                <span className="inline-flex rounded-[5px] bg-[#fff7d6] px-2 py-1.5 text-[9px] font-extrabold tracking-[.08em] text-[#765900]">PRODUTO · {product.category}</span>
                <h2><Link to={productHref}>{product.name}</Link></h2>
                <p className="text-[13px] leading-[1.6] text-[#716e60]">{product.description}</p>
                <div className="flex items-center justify-between gap-3 text-[11px] text-[#758590]">
                  <b className="whitespace-nowrap text-[15px] text-[#302b18]">{Number(product.price).toLocaleString("pt-MZ")} MT</b>
              
                  {store && <Link to={`/lojas/${encodeURIComponent(store.slug)}`}>{store.name}</Link>}
                </div>
                {store && <p className="mb-0 mt-[10px] text-[11px] text-[#716e60]">{store.verified ? "Loja verificada" : "Loja não verificada"} · {store.address}</p>}
                <SharePageButton
                  title={product.name}
                  text={shareText}
                  label="Partilhar produto"
                  url={`${window.location.origin}${productHref}`}
                  imageUrl={product.images?.[0]}
                />
                {canContactStore && store && (
                  <button
                    type="button"
                    className="mt-[15px] inline-flex min-h-[42px] w-full items-center justify-center gap-[9px] rounded-lg border-0 bg-[#302b18] px-[17px] text-[12px] font-bold text-white transition-[transform,background-color] duration-[160ms] hover:-translate-y-px hover:bg-[#ffd21a] hover:text-[#302b18] disabled:cursor-wait disabled:opacity-[.56]"
                    disabled={busy}
                    onClick={() => void contactProduct(store, product)}
                  >
                    <FiMessageCircle aria-hidden="true" /> Falar com a loja
                  </button>
                )}
                {store && !profile && (
                  <Link className="mt-[15px] inline-flex min-h-[42px] w-full items-center justify-center gap-[9px] rounded-lg border border-[#c8d6dd] bg-white px-[17px] text-[12px] font-bold text-[#302b18]" to="/conta">
                    <FiLogIn aria-hidden="true" />
                    Inicia sessão para conversar sobre este produto
                  </Link>
                )}
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}

export function StoresDirectoryPage({
  stores, query, onQueryChange, profile, busy, onStartStoreConversation,
  mapStores, gps, mapLoading, mapError, onLocate, onClearLocation
}: DirectoryProps & StoreConversationProps & { stores: Store[] }) {
  const [category, setCategory] = useState("");
  const navigate = useNavigate();
  const categories = useMemo(
    () => [...new Set(stores.flatMap((store) => parseDirectoryCategories(store.category)))].sort((a, b) => a.localeCompare(b, "pt-MZ")),
    [stores]
  );
  const filteredStores = useMemo(() => {
    const term = query.trim().toLocaleLowerCase();
    return stores.filter((store) => {
      const storeCategories = parseDirectoryCategories(store.category);
      return (!category || storeCategories.includes(category)) &&
        (!term || `${store.name} ${store.description} ${store.address} ${storeCategories.join(" ")}`.toLocaleLowerCase().includes(term));
    });
  }, [category, query, stores]);
  const visibleMapStores = useMemo(() => {
    const visibleStoreIds = new Set(filteredStores.map((store) => store.id));
    return mapStores
      .filter((mapStore) => visibleStoreIds.has(mapStore.id))
      .map((mapStore) => {
        const store = filteredStores.find((item) => item.id === mapStore.id);
        return {
          ...mapStore,
          href: store ? `/lojas/${encodeURIComponent(store.slug)}` : undefined
        };
      });
  }, [filteredStores, mapStores]);

  async function contactStore(store: Store) {
    const conversationId = await onStartStoreConversation(
      store.id,
      `Gostaria de obter informações sobre a loja ${store.name}.`
    );
    if (conversationId) await navigate(`/mensagens/lojas/${conversationId}`);
  }

  return (
    <section className="min-h-[65vh] px-[clamp(20px,7vw,100px)] py-[70px] max-[560px]:py-12">
      <div className="mb-[26px] flex flex-col gap-[22px] min-[851px]:flex-row min-[851px]:items-end min-[851px]:justify-between"><div><p className="mb-1 text-[10px] font-extrabold tracking-[.17em] text-[#765900]">NEGÓCIOS LOCAIS</p><h1 className="my-3 text-[clamp(28px,4vw,42px)] font-extrabold leading-tight tracking-[-.04em]">Lojas em Chimoio</h1><p className="m-0 text-[13px] text-[#716e60]">Encontra uma loja por nome, categoria ou localização.</p></div></div>
      <DirectoryFilters query={query} onQueryChange={onQueryChange} category={category} categories={categories} onCategoryChange={setCategory} searchLabel="Pesquisar lojas..." />
      <DirectoryMap
        title="Lojas no mapa"
        description="Filtra lojas por categoria e explora as que estão até 3 km da localização escolhida."
        stores={visibleMapStores}
        gps={gps}
        loading={mapLoading}
        error={mapError}
        entityLabel="lojas"
        categoryLabel="Categoria da loja"
        popupLinkLabel="Ver loja e produtos"
        emptyMessage="Ainda não há lojas com coordenadas para mostrar."
        onLocate={onLocate}
        onClearLocation={onClearLocation}
      />
      {!filteredStores.length ? <p className="col-span-full rounded-[10px] border border-dashed border-[#cbd8de] p-6 text-center text-[13px] text-[#716e60]">Não encontrámos lojas com estes filtros.</p> : (
        <div className="grid grid-cols-1 gap-[15px] min-[561px]:grid-cols-2 min-[851px]:grid-cols-3">
          {filteredStores.map((store) => {
            const storeHref = `/lojas/${encodeURIComponent(store.slug)}`;
            const canContactStore = Boolean(
              profile && profile.role !== "admin" && store.owner_id !== profile.id
            );
            return (
              <article className="min-h-[206px] rounded-xl border border-[#e7e1ca] bg-[#f5f9fb] p-[22px] shadow-[0_8px_18px_#16354a08]" key={store.id}>
                <Link to={storeHref}><CategoryImage className="my-3 block aspect-video w-full rounded-md bg-[#eef2f4] object-contain" src={store.logo_url} placeholder={STORE_CATEGORY_IMAGES[parseDirectoryCategories(store.category)[0]] ?? FALLBACK_IMAGE} alt={`Logótipo de ${store.name}`} /></Link>
                <span className={`inline-flex rounded-[5px] px-2 py-1.5 text-[9px] font-extrabold tracking-[.08em] ${store.verified ? "bg-[#e6f4ec] text-[#286f58]" : "bg-[#edf1f3] text-[#5f6d76]"}`}>
                  {store.verified ? "Loja verificada ✓" : "Loja não verificada"} · {parseDirectoryCategories(store.category).join(" · ")}
                </span>
                <h2><Link to={storeHref}>{store.name}</Link></h2>
                <p className="text-[13px] leading-[1.6] text-[#716e60]">{store.description}</p>
                <div className="flex items-center justify-between gap-3 text-[11px] text-[#758590]"><span>{store.address}</span><Link to={storeHref}>Ver loja</Link></div>
                <SharePageButton
                  title={store.name}
                  text={`Conhece a loja ${store.name} na YELLOW, em Chimoio.`}
                  label="Partilhar loja"
                  url={`${window.location.origin}${storeHref}`}
                  imageUrl={store.logo_url ?? undefined}
                />
                {canContactStore && (
                  <button
                    type="button"
                    className="mt-[15px] inline-flex min-h-[42px] w-full items-center justify-center gap-[9px] rounded-lg border-0 bg-[#302b18] px-[17px] text-[12px] font-bold text-white transition-[transform,background-color] duration-[160ms] hover:-translate-y-px hover:bg-[#ffd21a] hover:text-[#302b18] disabled:cursor-wait disabled:opacity-[.56]"
                    disabled={busy}
                    onClick={() => void contactStore(store)}
                  >
                    <FiMessageCircle aria-hidden="true" /> Falar com a loja
                  </button>
                )}
                {!profile && (
                  <Link className="mt-[15px] inline-flex min-h-[42px] w-full items-center justify-center gap-[9px] rounded-lg border border-[#c8d6dd] bg-white px-[17px] text-[12px] font-bold text-[#302b18]" to="/conta">
                    <FiLogIn aria-hidden="true" />
                    Inicia sessão para conversar com a loja
                  </Link>
                )}
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}

export function ServicesDirectoryPage({
  providers, services, query, onQueryChange, profile, busy, onStartNegotiation,
  gps, mapLoading, mapError, onLocate, onClearLocation
}: DirectoryProps & {
  providers: ServiceProvider[];
  services: Service[];
  profile: Profile | null;
  busy: boolean;
  onStartNegotiation: (serviceId: string) => void;
}) {
  const [category, setCategory] = useState("");
  const categories = useMemo(
    () => [...new Set(services.map((service) => service.category).filter(Boolean))].sort((a, b) => a.localeCompare(b, "pt-MZ")),
    [services]
  );
  const providersById = useMemo(() => new Map(providers.map((provider) => [provider.id, provider])), [providers]);
  const filteredServices = useMemo(() => {
    const term = query.trim().toLocaleLowerCase();
    return services.filter((service) => {
      const provider = providersById.get(service.provider_id);
      const providerCategories = parseDirectoryCategories(provider?.category);
      return (!category || service.category === category) &&
        (!term || `${service.title} ${service.description} ${service.category} ${providerCategories.join(" ")}`.toLocaleLowerCase().includes(term));
    });
  }, [category, providersById, query, services]);
  const serviceMapStores = useMemo<MapStore[]>(() => {
    const servicesByProvider = new Map<string, Service[]>();
    for (const service of filteredServices) {
      const providerServices = servicesByProvider.get(service.provider_id) ?? [];
      providerServices.push(service);
      servicesByProvider.set(service.provider_id, providerServices);
    }

    return providers.flatMap((provider) => {
      const neighborhood = CHIMOIO_NEIGHBORHOODS.find((item) => item.name === provider.neighborhood);
      const matchingServices = servicesByProvider.get(provider.id);
      if (!matchingServices?.length) return [];

      const serviceTitles = matchingServices.map((service) => service.title);
      const name = serviceTitles.length > 1
        ? `${serviceTitles[0]} + ${serviceTitles.length - 1}`
        : serviceTitles[0];
      return [{
        id: provider.id,
        name,
        category: [...new Set(matchingServices.map((service) => service.category))],
        address: neighborhood ? `Bairro ${neighborhood.name}` : "Bairro não indicado",
        latitude: neighborhood?.latitude ?? null,
        longitude: neighborhood?.longitude ?? null,
        verified: provider.verified,
        href: `/prestadores/${encodeURIComponent(provider.id)}`
      }];
    });
  }, [filteredServices, providers]);

  return (
    <section className="min-h-[65vh] px-[clamp(20px,7vw,100px)] py-[70px] max-[560px]:py-12">
      <div className="mb-[26px] flex flex-col gap-[22px] min-[851px]:flex-row min-[851px]:items-end min-[851px]:justify-between"><div><p className="mb-1 text-[10px] font-extrabold tracking-[.17em] text-[#765900]">PROFISSIONAIS LOCAIS</p><h1 className="my-3 text-[clamp(28px,4vw,42px)] font-extrabold leading-tight tracking-[-.04em]">Serviços em Chimoio</h1><p className="m-0 text-[13px] text-[#716e60]">Consulta serviços publicados e fala directamente com o prestador.</p></div></div>
      <DirectoryFilters query={query} onQueryChange={onQueryChange} category={category} categories={categories} onCategoryChange={setCategory} searchLabel="Pesquisar serviços..." />
      <DirectoryMap
        title="Prestadores de serviços no mapa"
        description="O mapa usa o centro aproximado do bairro indicado no perfil de cada prestador."
        stores={serviceMapStores}
        gps={gps}
        loading={mapLoading}
        error={mapError}
        entityLabel="prestadores"
        categoryLabel="Categoria do serviço"
        popupLinkLabel="Ver perfil do prestador"
        emptyMessage="Ainda não há prestadores com bairro registado para estes serviços."
        verificationLabels={{ verified: "Prestador verificado", unverified: "Prestador não verificado" }}
        onLocate={onLocate}
        onClearLocation={onClearLocation}
      />
      {!filteredServices.length ? <p className="col-span-full rounded-[10px] border border-dashed border-[#cbd8de] p-6 text-center text-[13px] text-[#716e60]">Não encontrámos serviços com estes filtros.</p> : (
        <div className="grid grid-cols-2 gap-3 min-[561px]:gap-[15px] min-[851px]:grid-cols-3">
          {filteredServices.map((service) => {
            const provider = providersById.get(service.provider_id);
            const serviceHref = provider
              ? providerServiceHref(provider.id, service.id)
              : `/prestadores/${encodeURIComponent(service.provider_id)}`;
            return (
              <article className="min-h-[206px] rounded-xl border border-[#e7e1ca] border-t-[3px] border-t-[#74ae8f] bg-white p-3 shadow-[0_8px_18px_#16354a08] min-[561px]:p-[22px]" key={service.id}>
                <Link to={serviceHref}><CategoryImage className="my-3 block aspect-video w-full rounded-md bg-[#eef2f4] object-cover" src={service.images?.[0]} placeholder={SERVICE_CATEGORY_IMAGES[service.category] ?? FALLBACK_IMAGE} alt={service.title} /></Link>
                <span className="inline-flex rounded-[5px] bg-[#e9f4ef] px-2 py-1.5 text-[9px] font-extrabold tracking-[.08em] text-[#2b745e]">{service.category}</span>
                <h2><Link to={serviceHref}>{service.title}</Link></h2>
                <p className="text-[13px] leading-[1.6] text-[#716e60]">{service.description}</p>
                <div className="flex items-center justify-between gap-3 text-[11px] text-[#758590]"><b className="whitespace-nowrap text-[15px] text-[#302b18]">{Number(service.price).toLocaleString("pt-MZ")} MT</b><span>{service.delivery_time}</span></div>
                {provider && <Link className="mt-[14px] inline-block text-xs font-bold text-[#765900]" to={`/prestadores/${encodeURIComponent(provider.id)}`}>Ver perfil do prestador</Link>}
                <SharePageButton
                  title={service.title}
                  text={`Conhece o serviço ${service.title} na YELLOW, em Chimoio.`}
                  label="Partilhar serviço"
                  url={`${window.location.origin}${serviceHref}`}
                  imageUrl={service.images?.[0]}
                />
                {profile?.role === "client" && (
                  <button
                    type="button"
                    className="mt-[15px] inline-flex min-h-[42px] w-full items-center justify-center gap-[9px] rounded-lg border-0 bg-[#302b18] px-[17px] text-[12px] font-bold text-white transition-[transform,background-color] duration-[160ms] hover:-translate-y-px hover:bg-[#ffd21a] hover:text-[#302b18] disabled:cursor-wait disabled:opacity-[.56]"
                    disabled={busy}
                    onClick={() => onStartNegotiation(service.id)}
                  >
                    <FiMessageCircle aria-hidden="true" /> Falar com o prestador
                  </button>
                )}
                {!profile && (
                  <Link className="mt-[15px] inline-flex min-h-[42px] w-full items-center justify-center gap-[9px] rounded-lg border border-[#c8d6dd] bg-white px-[17px] text-[12px] font-bold text-[#302b18]" to="/conta">
                    <FiLogIn aria-hidden="true" />
                    Inicia sessão para falar sobre este serviço
                  </Link>
                )}
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}

function parseDirectoryCategories(category: unknown): string[] {
  if (Array.isArray(category)) return category.filter((item): item is string => typeof item === "string");
  if (typeof category !== "string" || !category.trim()) return [];
  const value = category.trim();
  try {
    const parsed: unknown = JSON.parse(value);
    if (Array.isArray(parsed)) return parsed.filter((item): item is string => typeof item === "string");
  } catch {
    // Supabase may return PostgreSQL arrays in their textual form.
  }
  return value.replace(/^\{|\}$/g, "").split(",").map((item) => item.trim().replace(/^"(.*)"$/, "$1")).filter(Boolean);
}
