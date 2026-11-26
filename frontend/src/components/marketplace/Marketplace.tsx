import { useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import type { MapStore, Product, Profile, ProviderReview, Service, ServiceProvider, Store } from "../../lib/types";
import type { ReviewPayload } from "../../lib/api";
import { providerServiceHref, storeProductHref } from "../../lib/publicLinks";
import { distanceInKm, sortByDistance, type MapCenter } from "../../lib/mapStores";
import MapExplorer from "./MapExplorer";
import ReviewForm from "./ReviewForm";
import { CatalogNavigation, LocationPreference } from "./DirectoryControls";
import SharePageButton from "./SharePageButton";
import CategoryImage from "./CategoryImage";
import { FALLBACK_IMAGE, SERVICE_CATEGORY_IMAGES, STORE_CATEGORY_IMAGES } from "../../lib/categoryPlaceholders";
import { CHIMOIO_NEIGHBORHOODS } from "../../lib/chimoioNeighborhoods";

type MarketplaceProps = Readonly<{
  stores: Store[];
  mapStores: MapStore[];
  products: Product[];
  services: Service[];
  providers: ServiceProvider[];
  providerReviews: ProviderReview[];
  profile: Profile | null;
  busy: boolean;
  search: string;
  nearby: boolean;
  coordinates: [number, number] | null;
  selectedNeighborhood: string;
  mapLoading: boolean;
  mapError: string | null;
  priceDrafts: Record<string, string>;
  onSearchChange: (value: string) => void;
  onLocate: () => void;
  onSelectNeighborhood: (neighborhood: string) => void;
  onClearLocation: () => void;
  onPriceChange: (productId: string, value: string) => void;
  onUpdatePrice: (productId: string) => void;
  onStartStoreConversation: (storeId: string, content: string, productId?: string) => Promise<string | null>;
  onStartNegotiation: (serviceId: string) => void;
  onReview: (review: ReviewPayload) => Promise<boolean>;
}>;

function parseCategories(category: unknown): string[] {
  if (Array.isArray(category)) return category.filter((item): item is string => typeof item === "string");
  if (typeof category !== "string" || !category.trim()) return [];

  const value = category.trim();
  try {
    const parsed: unknown = JSON.parse(value);
    if (Array.isArray(parsed)) return parsed.filter((item): item is string => typeof item === "string");
  } catch {
    // Supabase may return PostgreSQL arrays in their textual form.
  }
  return value.replace(/^\{|\}$/g, "").split(/,(?=(?:[^"]*"[^"]*")*[^"]*$)/)
    .map((item) => item.trim().replace(/^"(.*)"$/, "$1"))
    .filter(Boolean);
}

function getDistanceLabel(
  center: MapCenter | null,
  latitude: number | string | null,
  longitude: number | string | null
): string | null {
  if (!center || latitude === null || longitude === null) return null;
  const parsedLatitude = Number(latitude);
  const parsedLongitude = Number(longitude);
  if (
    !Number.isFinite(parsedLatitude) ||
    !Number.isFinite(parsedLongitude) ||
    parsedLatitude < -90 ||
    parsedLatitude > 90 ||
    parsedLongitude < -180 ||
    parsedLongitude > 180
  ) return null;

  return `${distanceInKm(center[0], center[1], parsedLatitude, parsedLongitude).toFixed(1)} km`;
}

export default function Marketplace({
  stores,
  mapStores,
  products,
  services,
  providers,
  providerReviews,
  profile,
  busy,
  search,
  nearby,
  coordinates,
  selectedNeighborhood,
  mapLoading,
  mapError,
  priceDrafts,
  onSearchChange,
  onLocate,
  onSelectNeighborhood,
  onClearLocation,
  onPriceChange,
  onUpdatePrice,
  onStartStoreConversation,
  onStartNegotiation,
  onReview
}: MarketplaceProps) {
  const navigate = useNavigate();
  const term = search.trim().toLocaleLowerCase();
  const locationCenter = useMemo<MapCenter | null>(() => {
    const neighborhood = CHIMOIO_NEIGHBORHOODS.find((item) => item.name === selectedNeighborhood);
    return coordinates
      ? [coordinates[0], coordinates[1]]
      : neighborhood
        ? [neighborhood.latitude, neighborhood.longitude]
        : null;
  }, [coordinates, selectedNeighborhood]);
  const servicesByProvider = useMemo(() => {
    const grouped = new Map<string, Service[]>();
    for (const service of services) {
      const current = grouped.get(service.provider_id) ?? [];
      current.push(service);
      grouped.set(service.provider_id, current);
    }
    return grouped;
  }, [services]);
  const reviewsByProvider = useMemo(() => {
    const grouped = new Map<string, ProviderReview[]>();
    for (const review of providerReviews) {
      const current = grouped.get(review.target_id) ?? [];
      current.push(review);
      grouped.set(review.target_id, current);
    }
    return grouped;
  }, [providerReviews]);
  const listedProviders = useMemo(() => sortByDistance(providers
    .map((provider) => ({
      provider,
      services: servicesByProvider.get(provider.id) ?? [],
      reviews: reviewsByProvider.get(provider.id) ?? []
    }))
    .filter(({ services: providerServices }) => providerServices.length > 0)
    .sort((first, second) => {
      const firstAverage = first.reviews.length
        ? first.reviews.reduce((sum, review) => sum + review.rating, 0) / first.reviews.length
        : 0;
      const secondAverage = second.reviews.length
        ? second.reviews.reduce((sum, review) => sum + review.rating, 0) / second.reviews.length
        : 0;
      return secondAverage - firstAverage || second.reviews.length - first.reviews.length;
    }), ({ provider }) => {
      const neighborhood = CHIMOIO_NEIGHBORHOODS.find((item) => item.name === provider.neighborhood);
      return neighborhood ? [neighborhood.latitude, neighborhood.longitude] : null;
    }, locationCenter), [locationCenter, providers, reviewsByProvider, servicesByProvider]);
  const matchingStores = useMemo(() => sortByDistance(stores.filter((store) => {
    const categories = parseCategories(store.category);
    return !term || `${store.name} ${categories.join(" ")} ${store.address} ${store.description}`.toLocaleLowerCase().includes(term);
  }), (store) => store.latitude !== null && store.longitude !== null
    ? [store.latitude, store.longitude]
    : null, locationCenter), [locationCenter, stores, term]);
  const matchingProducts = useMemo(() => {
    const storeById = new Map(stores.map((store) => [store.id, store]));
    return sortByDistance(products.filter((product) =>
      !term || `${product.name} ${product.description} ${product.category}`.toLocaleLowerCase().includes(term)
    ), (product) => {
      const store = storeById.get(product.store_id);
      return store && store.latitude !== null && store.longitude !== null
        ? [store.latitude, store.longitude]
        : null;
    }, locationCenter);
  }, [locationCenter, products, stores, term]);

  return (
    <section className="px-[clamp(20px,7vw,100px)] py-12" id="mercado">
      <div className="mb-[26px] flex items-end justify-between gap-[22px] max-[700px]:flex-col">
        <div>
          <p className="text-[10px] font-extrabold tracking-[.17em] text-[var(--blue)]">CATÁLOGO PÚBLICO</p>
          <h2 className="my-2 mt-[9px] font-[Manrope,sans-serif] text-[clamp(24px,3vw,34px)] font-extrabold tracking-[-.04em]">Descubra a cidade</h2>
          <p className="m-0 text-[13px] text-[var(--muted)]">Encontre primeiro profissionais locais, explore o mapa e descubra as lojas.</p>
        </div>
        <div className="flex min-w-[min(100%,410px)] gap-2 max-[700px]:w-full">
          <input
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Prestador, produto, loja ou categoria..."
          />
        </div>
      </div>
      <LocationPreference
        neighborhood={selectedNeighborhood}
        gpsActive={Boolean(coordinates)}
        onNeighborhoodChange={onSelectNeighborhood}
        onLocate={onLocate}
      />
      <CatalogNavigation />

      <section className="mt-10" aria-labelledby="providers-heading">
        <div className="mb-[18px] flex items-end justify-between gap-[22px] max-[700px]:flex-col">
          <div>
            <p className="text-[10px] font-extrabold tracking-[.17em] text-[var(--blue)]">PROFISSIONAIS LOCAIS</p>
            <h2 id="providers-heading" className="my-[7px] font-[Manrope,sans-serif] text-[clamp(23px,3vw,32px)] font-extrabold tracking-[-.04em]">Prestadores de serviços</h2>
            <p className="m-0 text-[13px] text-[var(--muted)]">Explore serviços publicados e consulte as avaliações dos prestadores.</p>
          </div>
        </div>
        {listedProviders.length ? (
          <div className="grid grid-cols-1 gap-[15px] min-[851px]:grid-cols-3">
            {listedProviders.map(({ provider, services: providerServices, reviews }) => {
              const categories = parseCategories(provider.category);
              const providerNeighborhood = CHIMOIO_NEIGHBORHOODS.find(
                (item) => item.name === provider.neighborhood
              );
              const providerDistance = getDistanceLabel(
                locationCenter,
                providerNeighborhood?.latitude ?? null,
                providerNeighborhood?.longitude ?? null
              );
              const average = reviews.length
                ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length
                : null;
              return (
                <article className="min-h-[206px] rounded-xl border border-[var(--line)] border-t-[3px] border-t-[var(--yellow)] bg-white p-[22px] shadow-[0_8px_18px_#16354a08]" key={provider.id}>
                  <header className="flex items-start justify-between gap-3 max-[560px]:flex-col">
                    <div>
                      <span className="inline-flex rounded-[5px] bg-[#e9f4ef] px-2 py-1.5 text-[9px] font-extrabold tracking-[.08em] text-[#2b745e]">
                        {provider.verified ? "Prestador verificado" : "Prestador não verificado"}
                      </span>
                      <h3 className="my-[6px] mt-3 font-[Manrope,sans-serif] text-[17px] font-bold">{categories.join(" · ") || "Prestador local"}</h3>
                      <p className="m-0 text-[11px] text-[var(--muted)]">
                        {provider.neighborhood ?? "Bairro não indicado"}
                        {providerDistance && ` · ${providerDistance}`}
                      </p>
                    </div>
                    <Link className="mt-1 inline-block flex-none text-xs font-bold text-[var(--blue)]" to={`/prestadores/${encodeURIComponent(provider.id)}`}>
                      Ver perfil
                    </Link>
                  </header>
                  <p className="my-[5px] mb-3 text-sm font-extrabold text-[#9a7200]" aria-label={average === null ? "Ainda sem avaliações" : `Classificação ${average.toFixed(1)} em 5`}>
                    {average === null ? "Ainda sem avaliações" : <>★ {average.toFixed(1)} <span className="text-[11px] font-semibold text-[var(--muted)]">({reviews.length} {reviews.length === 1 ? "avaliação" : "avaliações"})</span></>}
                  </p>
                  {reviews.slice(0, 2).map((review, index) => (
                    review.comment.trim() && (
                      <blockquote className="my-2 rounded-r-md border-l-[3px] border-[var(--yellow)] bg-[var(--yellow-soft)] px-3 py-[9px] text-xs leading-[1.5] text-[#605d50]" key={`${review.target_id}-${review.created_at}-${index}`}>
                        “{review.comment}”
                      </blockquote>
                    )
                  ))}
                  {profile?.role === "client" && (
                    <ReviewForm
                      targetType="service_provider"
                      targetId={provider.id}
                      targetName={categories.join(", ") || "prestador"}
                      busy={busy}
                      onSubmit={onReview}
                    />
                  )}
                  <div className="mt-4 grid gap-3">
                    {providerServices.map((service) => (
                      <article className="border-t border-[var(--line)] pt-[14px]">
                        <Link to={providerServiceHref(provider.id, service.id)}>
                          <CategoryImage className="my-3 block aspect-video w-full rounded-md bg-[#eef2f4] object-cover" src={service.images?.[0]} placeholder={SERVICE_CATEGORY_IMAGES[service.category] ?? FALLBACK_IMAGE} alt={service.title} />
                        </Link>
                        <h4 className="my-[7px] mt-[10px] font-[Manrope,sans-serif] text-[15px] font-bold text-[var(--navy)]"><Link to={providerServiceHref(provider.id, service.id)}>{service.title}</Link></h4>
                        <p className="text-xs leading-[1.55] text-[var(--muted)]">{service.description}</p>
                        <div className="flex items-center justify-between gap-3 text-[11px] text-[#758590]">
                          <b className="whitespace-nowrap text-[15px] text-[var(--navy)]">{Number(service.price).toLocaleString("pt-MZ")} MT</b>
                          <span>{service.delivery_time}</span>
                        </div>
                        <SharePageButton
                          title={service.title}
                          text={`Conhece o serviço ${service.title} na YELLOW, em Chimoio.`}
                          label="Partilhar serviço"
                          url={`${window.location.origin}${providerServiceHref(provider.id, service.id)}`}
                          imageUrl={service.images?.[0]}
                        />
                        {profile?.role === "client" && (
                          <button
                            className="mt-[15px] inline-flex min-h-[42px] w-full items-center justify-center gap-[9px] rounded-lg bg-[var(--navy)] px-[17px] text-xs font-bold text-white transition-[transform,background-color] duration-[160ms] hover:enabled:-translate-y-px hover:enabled:bg-[var(--yellow)] hover:enabled:text-[var(--navy)] disabled:cursor-wait disabled:opacity-[.56]"
                            disabled={busy}
                            onClick={() => onStartNegotiation(service.id)}
                          >
                            Falar com este prestador
                          </button>
                        )}
                      </article>
                    ))}
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <p className="col-span-full rounded-[10px] border border-dashed border-[#cbd8de] p-6 text-center text-[13px] text-[var(--muted)]">
            {search ? "Não encontrámos prestadores para esta pesquisa." : "Ainda não há serviços publicados por prestadores."}
          </p>
        )}
      </section>

      <section className="mt-10" aria-labelledby="market-map-heading">
        <div className="mb-[18px] flex items-end justify-between gap-[22px] max-[700px]:flex-col">
          <div>
            <p className="text-[10px] font-extrabold tracking-[.17em] text-[var(--blue)]">PERTO DE SI</p>
            <h2 id="market-map-heading" className="my-[7px] font-[Manrope,sans-serif] text-[clamp(23px,3vw,32px)] font-extrabold tracking-[-.04em]">Mapa de lojas e bairros</h2>
            <p className="m-0 text-[13px] text-[var(--muted)]">Use o GPS para ver lojas num raio de 3 km ou escolha um bairro para explorar a zona.</p>
          </div>
        </div>
        <MapExplorer
          stores={mapStores}
          gps={nearby ? coordinates : null}
          loading={mapLoading}
          error={mapError}
          onLocate={onLocate}
          onClearLocation={onClearLocation}
        />
      </section>

      <section className="mt-10" aria-labelledby="stores-heading">
        <div className="mb-[18px] flex items-end justify-between gap-[22px] max-[700px]:flex-col">
          <div>
            <p className="text-[10px] font-extrabold tracking-[.17em] text-[var(--blue)]">NEGÓCIOS LOCAIS</p>
            <h2 id="stores-heading" className="my-[7px] font-[Manrope,sans-serif] text-[clamp(23px,3vw,32px)] font-extrabold tracking-[-.04em]">Lojas da cidade</h2>
            <p className="m-0 text-[13px] text-[var(--muted)]">Contacte as lojas e consulte as avaliações, incluindo as que ainda não foram verificadas.</p>
          </div>
        </div>
        {matchingStores.length ? (
          <div className="grid grid-cols-1 gap-[15px] min-[851px]:grid-cols-3">
            {matchingStores.map((store) => {
              const categories = parseCategories(store.category);
              const storeDistance = getDistanceLabel(locationCenter, store.latitude, store.longitude);
              return (
                <article className="min-h-[206px] rounded-xl border border-[var(--line)] bg-[#f5f9fb] p-[22px] shadow-[0_8px_18px_#16354a08]" key={store.id}>
                  <span className={`inline-flex rounded-[5px] px-2 py-1.5 text-[9px] font-extrabold tracking-[.08em] ${store.verified ? "bg-[#e9f4ef] text-[#2b745e]" : "bg-[var(--yellow-soft)] text-[#765900]"}`}>
                    {store.verified ? "Loja verificada ✓" : "Loja não verificada"} · {categories.join(" · ")}
                  </span>
                  <Link to={`/lojas/${encodeURIComponent(store.slug)}`}>
                    <CategoryImage className="my-3 block aspect-video w-full rounded-md bg-[#eef2f4] object-cover" src={store.logo_url} placeholder={STORE_CATEGORY_IMAGES[categories[0]] ?? FALLBACK_IMAGE} alt={`Logótipo de ${store.name}`} />
                  </Link>
                  <h3 className="my-2 mt-[13px] font-[Manrope,sans-serif] text-[17px] font-bold"><Link to={`/lojas/${encodeURIComponent(store.slug)}`}>{store.name}</Link></h3>
                  <p className="text-[13px] leading-[1.6] text-[var(--muted)]">{store.description}</p>
                  <div className="flex items-center justify-between gap-3 text-[11px] text-[#758590]"><span>{store.address}</span></div>
                  {storeDistance && (
                    <p className="mt-2 text-[11px] font-semibold text-[#765900]">
                      {storeDistance} da localização escolhida
                    </p>
                  )}
                  <SharePageButton
                    title={store.name}
                    text={`Conhece a loja ${store.name} na YELLOW, em Chimoio.`}
                    label="Partilhar loja"
                    url={`${window.location.origin}/lojas/${encodeURIComponent(store.slug)}`}
                    imageUrl={store.logo_url ?? undefined}
                  />
                  {profile && profile.role !== "admin" && store.owner_id !== profile.id && (
                    <button
                      type="button"
                      className="mt-[15px] inline-flex min-h-[42px] w-full items-center justify-center gap-[9px] rounded-lg bg-[var(--navy)] px-[17px] text-xs font-bold text-white transition-[transform,background-color] duration-[160ms] hover:enabled:-translate-y-px hover:enabled:bg-[var(--yellow)] hover:enabled:text-[var(--navy)] disabled:cursor-wait disabled:opacity-[.56]"
                      disabled={busy}
                      onClick={() => {
                        void onStartStoreConversation(
                          store.id,
                          `Gostaria de obter informações sobre a loja ${store.name}.`
                        ).then((conversationId) => {
                          if (conversationId) void navigate(`/mensagens/lojas/${conversationId}`);
                        });
                      }}
                    >
                      Falar com a loja
                    </button>
                  )}
                  {!profile && (
                    <Link className="mt-[15px] inline-flex min-h-[42px] w-full items-center justify-center gap-[9px] rounded-lg border border-[#c8d6dd] bg-white px-[17px] text-xs font-bold text-[var(--navy)]" to="/conta">
                      Inicia sessão para conversar com a loja
                    </Link>
                  )}
                  {profile?.role === "client" && (
                    <ReviewForm
                      targetType="store"
                      targetId={store.id}
                      targetName={store.name}
                      busy={busy}
                      onSubmit={onReview}
                    />
                  )}
                </article>
              );
            })}
          </div>
        ) : (
          <p className="col-span-full rounded-[10px] border border-dashed border-[#cbd8de] p-6 text-center text-[13px] text-[var(--muted)]">
            {search ? "Não encontrámos lojas para esta pesquisa." : "Ainda não há lojas registadas."}
          </p>
        )}
      </section>

      <section className="mt-10" aria-labelledby="products-heading">
        <div className="mb-[18px] flex items-end justify-between gap-[22px] max-[700px]:flex-col">
          <div>
            <p className="text-[10px] font-extrabold tracking-[.17em] text-[var(--blue)]">PRODUTOS LOCAIS</p>
            <h2 id="products-heading" className="my-[7px] font-[Manrope,sans-serif] text-[clamp(23px,3vw,32px)] font-extrabold tracking-[-.04em]">Produtos das lojas</h2>
          </div>
        </div>
        {matchingProducts.length ? (
          <div className="grid grid-cols-1 gap-[15px] min-[851px]:grid-cols-3">
            {matchingProducts.map((product) => {
              const store = stores.find((item) => item.id === product.store_id);
              const productHref = store
                ? storeProductHref(store.slug, product.id)
                : `/produtos/${encodeURIComponent(product.id)}`;
              const storeDistance = store
                ? getDistanceLabel(locationCenter, store.latitude, store.longitude)
                : null;
              return (
                <article className="min-h-[206px] rounded-xl border border-[var(--line)] bg-white p-[22px] shadow-[0_8px_18px_#16354a08]" key={product.id}>
                  <span className="inline-flex rounded-[5px] bg-[var(--yellow-soft)] px-2 py-1.5 text-[9px] font-extrabold tracking-[.08em] text-[#765900]">PRODUTO · {product.category}</span>
                  <Link to={productHref}>
                    <CategoryImage className="my-3 block aspect-video w-full rounded-md bg-[#eef2f4] object-cover" src={product.images?.[0]} placeholder={STORE_CATEGORY_IMAGES[product.category] ?? FALLBACK_IMAGE} alt={product.name} />
                  </Link>
                  <h3 className="my-2 mt-[13px] font-[Manrope,sans-serif] text-[17px] font-bold"><Link to={productHref}>{product.name}</Link></h3>
                  <p className="text-[13px] leading-[1.6] text-[var(--muted)]">{product.description}</p>
                  <div className="flex items-center justify-between gap-3 text-[11px] text-[#758590]">
                    <b className="whitespace-nowrap text-[15px] text-[var(--navy)]">{Number(product.price).toLocaleString("pt-MZ")} MT</b>
                    {store ? <Link to={`/lojas/${encodeURIComponent(store.slug)}`}>{store.name}</Link> : <span>Loja local</span>}
                  </div>
                  {store && (
                    <p className="mt-[10px] text-[11px] text-[var(--muted)]">
                      {store.verified ? "Loja verificada" : "Loja não verificada"}
                      {store.address && ` · ${store.address}`}
                      {storeDistance && ` · ${storeDistance}`}
                    </p>
                  )}
                  <SharePageButton
                    title={product.name}
                    text={`Conhece ${product.name}${store ? ` na loja ${store.name}` : ""} na YELLOW, em Chimoio.`}
                    label="Partilhar produto"
                    url={`${window.location.origin}${productHref}`}
                    imageUrl={product.images?.[0]}
                  />
                  {store && profile && profile.role !== "admin" && store.owner_id !== profile.id && (
                    <button
                      type="button"
                      className="mt-[15px] inline-flex min-h-[42px] w-full items-center justify-center gap-[9px] rounded-lg bg-[var(--navy)] px-[17px] text-xs font-bold text-white transition-[transform,background-color] duration-[160ms] hover:enabled:-translate-y-px hover:enabled:bg-[var(--yellow)] hover:enabled:text-[var(--navy)] disabled:cursor-wait disabled:opacity-[.56]"
                      disabled={busy}
                      onClick={() => {
                        void onStartStoreConversation(
                          store.id,
                          `Tenho interesse no produto ${product.name}.`,
                          product.id
                        ).then((conversationId) => {
                          if (conversationId) void navigate(`/mensagens/lojas/${conversationId}`);
                        });
                      }}
                    >
                      Falar com a loja
                    </button>
                  )}
                  {store && !profile && (
                    <Link className="mt-[15px] inline-flex min-h-[42px] w-full items-center justify-center gap-[9px] rounded-lg border border-[#c8d6dd] bg-white px-[17px] text-xs font-bold text-[var(--navy)]" to="/conta">
                      Inicia sessão para conversar sobre este produto
                    </Link>
                  )}
                  {store?.owner_id === profile?.id && (
                    <div className="mt-3 flex gap-2">
                      <input
                        type="number"
                        min="0.01"
                        step="0.01"
                        value={priceDrafts[product.id] ?? product.price}
                        onChange={(event) => onPriceChange(product.id, event.target.value)}
                        aria-label={`Novo preço de ${product.name}`}
                      />
                      <button className="inline-flex min-h-[42px] items-center justify-center gap-[9px] rounded-lg border border-[#c8d6dd] bg-white px-[17px] text-xs font-bold text-[var(--navy)]" onClick={() => onUpdatePrice(product.id)}>Alterar preço</button>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        ) : (
          <p className="col-span-full rounded-[10px] border border-dashed border-[#cbd8de] p-6 text-center text-[13px] text-[var(--muted)]">
            {search ? "Não encontrámos produtos para esta pesquisa." : "Ainda não há produtos publicados."}
          </p>
        )}
      </section>
    </section>
  );
}
