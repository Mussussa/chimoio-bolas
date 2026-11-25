import { useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import type { MapStore, Product, Profile, ProviderReview, Service, ServiceProvider, Store } from "../../lib/types";
import type { ReviewPayload } from "../../lib/api";
import { providerServiceHref, storeProductHref } from "../../lib/publicLinks";
import { distanceInKm } from "../../lib/mapStores";
import MapExplorer from "./MapExplorer";
import ReviewForm from "./ReviewForm";
import { CatalogNavigation } from "./DirectoryControls";
import SharePageButton from "./SharePageButton";

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
  mapLoading: boolean;
  mapError: string | null;
  priceDrafts: Record<string, string>;
  onSearchChange: (value: string) => void;
  onLocate: () => void;
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
  mapLoading,
  mapError,
  priceDrafts,
  onSearchChange,
  onLocate,
  onClearLocation,
  onPriceChange,
  onUpdatePrice,
  onStartStoreConversation,
  onStartNegotiation,
  onReview
}: MarketplaceProps) {
  const navigate = useNavigate();
  const term = search.trim().toLocaleLowerCase();
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
  const listedProviders = useMemo(() => providers
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
    }), [providers, reviewsByProvider, servicesByProvider]);
  const matchingStores = useMemo(() => stores.filter((store) => {
    const categories = parseCategories(store.category);
    return !term || `${store.name} ${categories.join(" ")} ${store.address} ${store.description}`.toLocaleLowerCase().includes(term);
  }), [stores, term]);
  const matchingProducts = useMemo(() => products.filter((product) =>
    !term || `${product.name} ${product.description} ${product.category}`.toLocaleLowerCase().includes(term)
  ), [products, term]);

  return (
    <section className="market section" id="mercado">
      <div className="section-head">
        <div>
          <p className="eyebrow">CATÁLOGO PÚBLICO</p>
          <h2>Descubra a cidade</h2>
          <p>Encontre primeiro profissionais locais, explore o mapa e descubra as lojas.</p>
        </div>
        <div className="search-box">
          <input
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Prestador, produto, loja ou categoria..."
          />
        </div>
      </div>
      <CatalogNavigation />

      <section className="marketplace-priority-section" aria-labelledby="providers-heading">
        <div className="section-head">
          <div>
            <p className="eyebrow">PROFISSIONAIS LOCAIS</p>
            <h2 id="providers-heading">Prestadores de serviços</h2>
            <p>Explore serviços publicados e consulte as avaliações dos prestadores.</p>
          </div>
        </div>
        {listedProviders.length ? (
          <div className="catalog-grid">
            {listedProviders.map(({ provider, services: providerServices, reviews }) => {
              const categories = parseCategories(provider.category);
              const average = reviews.length
                ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length
                : null;
              return (
                <article className="listing-card provider-market-card" key={provider.id}>
                  <header className="provider-market-heading">
                    <div>
                      <span className="tag tag-green">
                        {provider.verified ? "Prestador verificado" : "Prestador não verificado"}
                      </span>
                      <h3>{categories.join(" · ") || "Prestador local"}</h3>
                    </div>
                    <Link className="detail-inline-link" to={`/prestadores/${encodeURIComponent(provider.id)}`}>
                      Ver perfil
                    </Link>
                  </header>
                  <p className="provider-rating" aria-label={average === null ? "Ainda sem avaliações" : `Classificação ${average.toFixed(1)} em 5`}>
                    {average === null ? "Ainda sem avaliações" : <>★ {average.toFixed(1)} <span>({reviews.length} {reviews.length === 1 ? "avaliação" : "avaliações"})</span></>}
                  </p>
                  {reviews.slice(0, 2).map((review, index) => (
                    review.comment.trim() && (
                      <blockquote className="provider-review-quote" key={`${review.target_id}-${review.created_at}-${index}`}>
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
                  <div className="provider-service-list">
                    {providerServices.map((service) => (
                      <article className="provider-service-listing" key={service.id}>
                        {service.images?.[0] && (
                          <Link to={providerServiceHref(provider.id, service.id)}>
                            <img className="service-listing-image" src={service.images[0]} alt={service.title} />
                          </Link>
                        )}
                        <h4><Link to={providerServiceHref(provider.id, service.id)}>{service.title}</Link></h4>
                        <p>{service.description}</p>
                        <div className="listing-foot">
                          <b>{Number(service.price).toLocaleString("pt-MZ")} MT</b>
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
                            className="button button-dark full-button"
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
          <p className="empty">
            {search ? "Não encontrámos prestadores para esta pesquisa." : "Ainda não há serviços publicados por prestadores."}
          </p>
        )}
      </section>

      <section className="marketplace-map-section" aria-labelledby="market-map-heading">
        <div className="section-head">
          <div>
            <p className="eyebrow">PERTO DE SI</p>
            <h2 id="market-map-heading">Mapa de lojas e bairros</h2>
            <p>Use o GPS para ver lojas num raio de 3 km ou escolha um bairro para explorar a zona.</p>
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

      <section className="marketplace-priority-section" aria-labelledby="stores-heading">
        <div className="section-head">
          <div>
            <p className="eyebrow">NEGÓCIOS LOCAIS</p>
            <h2 id="stores-heading">Lojas da cidade</h2>
            <p>Contacte as lojas e consulte as avaliações, incluindo as que ainda não foram verificadas.</p>
          </div>
        </div>
        {matchingStores.length ? (
          <div className="catalog-grid">
            {matchingStores.map((store) => {
              const categories = parseCategories(store.category);
              return (
                <article className="listing-card store-card" key={store.id}>
                  <span className={`tag ${store.verified ? "tag-verified" : "tag-new-store"}`}>
                    {store.verified ? "Loja verificada ✓" : "Loja não verificada"} · {categories.join(" · ")}
                  </span>
                  {store.logo_url && (
                    <Link to={`/lojas/${encodeURIComponent(store.slug)}`}>
                      <img className="service-listing-image store-listing-logo" src={store.logo_url} alt={`Logótipo de ${store.name}`} />
                    </Link>
                  )}
                  <h3><Link to={`/lojas/${encodeURIComponent(store.slug)}`}>{store.name}</Link></h3>
                  <p>{store.description}</p>
                  <div className="listing-foot"><span>{store.address}</span></div>
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
                      className="button button-dark full-button"
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
                    <Link className="button button-outline full-button" to="/conta">
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
          <p className="empty">
            {search ? "Não encontrámos lojas para esta pesquisa." : "Ainda não há lojas registadas."}
          </p>
        )}
      </section>

      <section className="marketplace-priority-section" aria-labelledby="products-heading">
        <div className="section-head">
          <div>
            <p className="eyebrow">PRODUTOS LOCAIS</p>
            <h2 id="products-heading">Produtos das lojas</h2>
          </div>
        </div>
        {matchingProducts.length ? (
          <div className="catalog-grid">
            {matchingProducts.map((product) => {
              const store = stores.find((item) => item.id === product.store_id);
              const productHref = store
                ? storeProductHref(store.slug, product.id)
                : `/produtos/${encodeURIComponent(product.id)}`;
              return (
                <article className="listing-card" key={product.id}>
                  <span className="tag">PRODUTO · {product.category}</span>
                  {product.images?.[0] && (
                    <Link to={productHref}>
                      <img className="service-listing-image" src={product.images[0]} alt={product.name} />
                    </Link>
                  )}
                  <h3><Link to={productHref}>{product.name}</Link></h3>
                  <p>{product.description}</p>
                  <div className="listing-foot">
                    <b>{Number(product.price).toLocaleString("pt-MZ")} MT</b>
                    {store ? <Link to={`/lojas/${encodeURIComponent(store.slug)}`}>{store.name}</Link> : <span>Loja local</span>}
                  </div>
                  {store && (
                    <p className="listing-location">
                      {store.verified ? "Loja verificada" : "Loja não verificada"}
                      {store.address && ` · ${store.address}`}
                      {coordinates && store.latitude !== null && store.longitude !== null &&
                        Number.isFinite(Number(store.latitude)) && Number.isFinite(Number(store.longitude)) &&
                        ` · ${distanceInKm(coordinates[0], coordinates[1], Number(store.latitude), Number(store.longitude)).toFixed(1)} km`}
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
                      className="button button-dark full-button"
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
                    <Link className="button button-outline full-button" to="/conta">
                      Inicia sessão para conversar sobre este produto
                    </Link>
                  )}
                  {store?.owner_id === profile?.id && (
                    <div className="price-editor">
                      <input
                        type="number"
                        min="0.01"
                        step="0.01"
                        value={priceDrafts[product.id] ?? product.price}
                        onChange={(event) => onPriceChange(product.id, event.target.value)}
                        aria-label={`Novo preço de ${product.name}`}
                      />
                      <button className="button button-outline" onClick={() => onUpdatePrice(product.id)}>Alterar preço</button>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        ) : (
          <p className="empty">
            {search ? "Não encontrámos produtos para esta pesquisa." : "Ainda não há produtos publicados."}
          </p>
        )}
      </section>
    </section>
  );
}
