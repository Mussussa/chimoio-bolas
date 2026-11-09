import type { Product, Profile, Service, ServiceProvider, Store } from "../lib/types";
import MapExplorer from "./MapExplorer";

type MarketplaceProps = {
  stores: Store[];
  products: Product[];
  services: Service[];
  providers: ServiceProvider[];
  profile: Profile | null;
  busy: boolean;
  search: string;
  nearby: boolean;
  coordinates: [number, number] | null;
  priceDrafts: Record<string, string>;
  onSearchChange: (value: string) => void;
  onLocate: () => void;
  onClearLocation: () => void;
  onPriceChange: (productId: string, value: string) => void;
  onUpdatePrice: (productId: string) => void;
  onStartNegotiation: (serviceId: string) => void;
};

export default function Marketplace({
  stores,
  products,
  services,
  providers,
  profile,
  busy,
  search,
  nearby,
  coordinates,
  priceDrafts,
  onSearchChange,
  onLocate,
  onClearLocation,
  onPriceChange,
  onUpdatePrice,
  onStartNegotiation
}: MarketplaceProps) {
  return (
    <section className="market section" id="mercado">
      <div className="section-head">
        <div><p className="eyebrow">CATÁLOGO PÚBLICO</p><h2>Descubra a cidade</h2><p>As listas e coordenadas são lidas directamente do Supabase com políticas RLS.</p></div>
        <div className="search-box">
          <input value={search} onChange={(event) => onSearchChange(event.target.value)} placeholder="Produto, serviço ou categoria..." />
          <button className="button button-outline" onClick={onLocate}>Usar GPS</button>
        </div>
      </div>
      {nearby && coordinates && <p className="geo-note">Distâncias calculadas no navegador a partir da sua localização. <button onClick={onClearLocation}>Limpar</button></p>}
      <MapExplorer stores={stores} gps={coordinates} />
      <div className="catalog-grid">
        {products.map((product) => {
          const store = stores.find((item) => item.id === product.store_id);
          return (
            <article className="listing-card" key={product.id}>
              <span className="tag">PRODUTO · {product.category}</span>
              <h3>{product.name}</h3>
              <p>{product.description}</p>
              <div className="listing-foot"><b>{Number(product.price).toLocaleString("pt-MZ")} MT</b><span>{store?.name ?? "Loja local"}</span></div>
              {store?.owner_id === profile?.id && (
                <div className="price-editor">
                  <input type="number" min="0.01" step="0.01" value={priceDrafts[product.id] ?? product.price} onChange={(event) => onPriceChange(product.id, event.target.value)} aria-label={`Novo preço de ${product.name}`} />
                  <button className="button button-outline" onClick={() => onUpdatePrice(product.id)}>Alterar preço</button>
                </div>
              )}
            </article>
          );
        })}
        {services.map((service) => {
          const provider = providers.find((item) => item.id === service.provider_id);
          return (
            <article className="listing-card service-card" key={service.id}>
              <span className="tag tag-green">SERVIÇO · NA PLATAFORMA</span>
              <h3>{service.title}</h3>
              <p>{service.description}</p>
              <div className="listing-foot"><b>{Number(service.price).toLocaleString("pt-MZ")} MT</b><span>{provider?.category} · {service.delivery_time}</span></div>
              {profile?.role === "client" && <button className="button button-dark full-button" disabled={busy} onClick={() => onStartNegotiation(service.id)}>Iniciar negociação</button>}
            </article>
          );
        })}
        {stores.filter((store) => !search || `${store.name} ${store.category.join(" ")}`.toLowerCase().includes(search.toLowerCase())).map((store) => (
          <article className="listing-card store-card" key={store.id}>
            <span className="tag">LOJA VERIFICADA · {store.category.join(" · ")}</span>
            <h3>{store.name}</h3>
            <p>{store.description}</p>
            <div className="listing-foot">
              <span>{store.address}</span>
              {coordinates && <b>{distance(coordinates[0], coordinates[1], Number(store.latitude), Number(store.longitude)).toFixed(1)} km</b>}
            </div>
          </article>
        ))}
        {!products.length && !services.length && !stores.length && <p className="empty">Ainda não há ofertas públicas. Liga o Supabase local e executa as migrations para iniciar.</p>}
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
