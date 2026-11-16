import { useMemo } from "react";
import { Link } from "react-router-dom";
import type { MapStore, Product, Profile, Service, ServiceProvider, Store } from "../../lib/types";
import type { ReviewPayload } from "../../lib/api";
import MapExplorer from "./MapExplorer";
import ReviewForm from "./ReviewForm";
import { CatalogNavigation } from "./DirectoryControls";

type MarketplaceProps = Readonly<{
  stores: Store[];
  mapStores: MapStore[];
  products: Product[];
  services: Service[];
  providers: ServiceProvider[];
  profile: Profile | null;
  busy: boolean;
  search: string;
  nearby: boolean;
  coordinates: [number, number] | null;
  mapLoading: boolean;
  mapError: string | null;
  priceDrafts: Record<string, string>;
  onClearFilters: () => void;
  onSearchChange: (value: string) => void;
  onLocate: () => void;
  onClearLocation: () => void;
  onPriceChange: (productId: string, value: string) => void;
  onUpdatePrice: (productId: string) => void;
  onStartNegotiation: (serviceId: string) => void;
  onReview: (review: ReviewPayload) => Promise<boolean>;
}>;

// Função auxiliar para normalizar e converter categorias com segurança total de tipos
function parseCategories(category: unknown): string[] {
  if (Array.isArray(category)) {
    return category.filter((item): item is string => typeof item === "string");
  }
  if (typeof category === "string" && category.trim()) {
    const value = category.trim();
    try {
      const parsed: unknown = JSON.parse(value);
      if (Array.isArray(parsed)) return parsed.filter((item): item is string => typeof item === "string");
    } catch {
      // Category arrays may also arrive in PostgreSQL's textual format.
    }
    return value.replace(/^\{|\}$/g, "").split(",").map((item) => item.trim().replace(/^"(.*)"$/, "$1")).filter(Boolean);
  }
  return [];
}

export default function Marketplace({
  stores,
  mapStores,
  products,
  services,
  providers,
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
  onClearFilters,
  onPriceChange,
  onUpdatePrice,
  onStartNegotiation,
  onReview
}: MarketplaceProps) {
  const matchingStores = useMemo(() => stores.filter((store) => {
    const categories = parseCategories(store.category);
    const term = search.trim().toLocaleLowerCase();
    return !term || `${store.name} ${categories.join(" ")} ${store.address} ${store.description}`.toLocaleLowerCase().includes(term);
  }), [search, stores]);
  const hasResults = products.length > 0 || services.length > 0 || matchingStores.length > 0;

  return (
    <section className="market section" id="mercado">
      <div className="section-head">
        <div>
          <p className="eyebrow">CATÁLOGO PÚBLICO</p>
          <h2>Descubra a cidade</h2>
          <p>Encontra produtos, serviços e lojas perto de ti.</p>
        </div>
        <div className="search-box">
          <input 
            value={search} 
            onChange={(event) => onSearchChange(event.target.value)} 
            placeholder="Produto, serviço ou categoria..." 
          />
          <button className="button button-outline" onClick={onLocate}>Usar GPS</button>
        </div>
      </div>
      <CatalogNavigation />
      {nearby && coordinates && (
        <p className="geo-note">
          Distâncias calculadas no navegador a partir da sua localização. <button onClick={onClearLocation}>Limpar</button>
        </p>
      )}
      <MapExplorer stores={mapStores} gps={coordinates} loading={mapLoading} error={mapError} />
      <div className="catalog-grid">
        {products.map((product) => {
          const store = stores.find((item) => item.id === product.store_id);
          const productHref = store
            ? `/lojas/${encodeURIComponent(store.slug)}#produto-${product.id}`
            : `/produtos/${product.id}`;
          return (
            <article className="listing-card" key={product.id}>
              <span className="tag">PRODUTO · {product.category}</span>
              {product.images?.[0] && <Link to={productHref}><img className="service-listing-image" src={product.images[0]} alt={product.name} /></Link>}
              <h3><Link to={productHref}>{product.name}</Link></h3>
              <p>{product.description}</p>
              <div className="listing-foot">
                <b>{Number(product.price).toLocaleString("pt-MZ")} MT</b>
                {store ? <Link to={`/lojas/${store.slug}`}>{store.name}</Link> : <span>Loja local</span>}
              </div>
              {store?.address && <p className="listing-location">{store.address}{coordinates && store.latitude !== null && store.longitude !== null &&
                Number.isFinite(Number(store.latitude)) && Number.isFinite(Number(store.longitude)) &&
                ` · ${distance(coordinates[0], coordinates[1], Number(store.latitude), Number(store.longitude)).toFixed(1)} km`}</p>}
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

        <div id="servicos" className="catalog-section-anchor" />
        {services.map((service) => {
          const provider = providers.find((item) => item.id === service.provider_id);
          return (
            <article className="listing-card service-card" key={service.id}>
              <span className="tag tag-green">SERVIÇO · NA PLATAFORMA</span>
              {service.images?.[0] && <img className="service-listing-image" src={service.images[0]} alt={service.title} />}
              <h3><Link to={`/prestadores/${service.provider_id}`}>{service.title}</Link></h3>
              <p>{service.description}</p>
              <div className="listing-foot">
                <b>{Number(service.price).toLocaleString("pt-MZ")} MT</b>
                <Link to={`/prestadores/${service.provider_id}`}>{provider?.category.join(", ") || service.category} · Ver prestador</Link>
              </div>
              {profile?.role === "client" && (
                <>
                  <button className="button button-dark full-button" disabled={busy} onClick={() => onStartNegotiation(service.id)}>
                    Iniciar negociação
                  </button>
                  {provider && <ReviewForm targetType="service_provider" targetId={provider.id} targetName={provider.category.join(", ")} busy={busy} onSubmit={onReview} />}
                </>
              )}
            </article>
          );
        })}

        {matchingStores.map((store) => {
            const cats = parseCategories(store.category);
            return (
              <article className="listing-card store-card" key={store.id}>
                <span className={`tag ${store.verified ? "tag-verified" : "tag-new-store"}`}>
                  {store.verified ? "Loja verificada ✓" : "Nova loja"} · {cats.join(" · ")}
                </span>
                {store.logo_url && <img className="service-listing-image store-listing-logo" src={store.logo_url} alt={`Logótipo de ${store.name}`} />}
                <h3><Link to={`/lojas/${store.slug}`}>{store.name}</Link></h3>
                <p>{store.description}</p>
                <div className="listing-foot">
                  <span>{store.address}</span>
                  {coordinates && store.latitude !== null && store.longitude !== null &&
                    Number.isFinite(Number(store.latitude)) && Number.isFinite(Number(store.longitude)) && (
                    <b>{distance(coordinates[0], coordinates[1], Number(store.latitude), Number(store.longitude)).toFixed(1)} km</b>
                  )}
                </div>
                {profile?.role === "client" && store.verified && (
                  <ReviewForm targetType="store" targetId={store.id} targetName={store.name} busy={busy} onSubmit={onReview} />
                )}
              </article>
            );
        })}

        {!hasResults && (
          <div className="empty">
            <p>{search ? `Não encontrámos ofertas para “${search}”.` : "Ainda não há ofertas nesta categoria."}</p>
            <button type="button" className="button button-outline" onClick={onClearFilters}>
              Limpar filtros
            </button>
          </div>
        )}
      </div>
    </section>
  );
}

function distance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const radians = (value: number) => value * Math.PI / 180;
  const deltaLat = radians(lat2 - lat1);
  const deltaLon = radians(lon2 - lon1);
  const a = Math.sin(deltaLat / 2) ** 2 + Math.cos(radians(lat1)) * Math.cos(radians(lat2)) * Math.sin(deltaLon / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}