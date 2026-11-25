import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import type { Product, Profile, Service, ServiceProvider, Store } from "../lib/types";
import { providerServiceHref, storeProductHref } from "../lib/publicLinks";
import { CatalogNavigation, DirectoryFilters } from "../components/marketplace/DirectoryControls";
import SharePageButton from "../components/marketplace/SharePageButton";

type DirectoryProps = Readonly<{
  query: string;
  onQueryChange: (value: string) => void;
}>;

type StoreConversationProps = Readonly<{
  profile: Profile | null;
  busy: boolean;
  onStartStoreConversation: (storeId: string, content: string, productId?: string) => Promise<string | null>;
}>;

export function ProductsDirectoryPage({
  products, stores, query, onQueryChange, profile, busy, onStartStoreConversation
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
  const filteredProducts = useMemo(() => {
    const term = query.trim().toLocaleLowerCase();
    return products.filter((product) => {
      const store = stores.find((item) => item.id === product.store_id);
      return (!category || product.category === category) &&
        (!term || `${product.name} ${product.description} ${product.category} ${store?.name ?? ""}`.toLocaleLowerCase().includes(term));
    });
  }, [category, products, query, stores]);

  async function contactProduct(store: Store, product: Product) {
    const conversationId = await onStartStoreConversation(
      store.id,
      `Tenho interesse no produto ${product.name}.`,
      product.id
    );
    if (conversationId) await navigate(`/mensagens/lojas/${conversationId}`);
  }

  return (
    <section className="section public-detail">
      <div className="section-head"><div><p className="eyebrow">CATÁLOGO LOCAL</p><h1>Produtos em Chimoio</h1><p>Pesquisa produtos e abre a loja directamente no produto escolhido.</p></div></div>
      <CatalogNavigation />
      <DirectoryFilters query={query} onQueryChange={onQueryChange} category={category} categories={categories} onCategoryChange={setCategory} searchLabel="Pesquisar produtos..." />
      {!filteredProducts.length ? <p className="empty">Não encontrámos produtos com estes filtros.</p> : (
        <div className="catalog-grid">
          {filteredProducts.map((product) => {
            const store = stores.find((item) => item.id === product.store_id);
            const productHref = store ? storeProductHref(store.slug, product.id) : `/produtos/${encodeURIComponent(product.id)}`;
            const canContactStore = Boolean(
              store?.verified && profile && profile.role !== "admin" && store.owner_id !== profile.id
            );
            const shareText = store
              ? `${product.name} na loja ${store.name} · ${Number(product.price).toLocaleString("pt-MZ")} MT.`
              : `${product.name} · ${Number(product.price).toLocaleString("pt-MZ")} MT.`;
            return (
              <article className="listing-card" key={product.id}>
                {product.images?.[0] && <Link to={productHref}><img className="service-listing-image" src={product.images[0]} alt={product.name} /></Link>}
                <span className="tag">PRODUTO · {product.category}</span>
                <h2><Link to={productHref}>{product.name}</Link></h2>
                <p>{product.description}</p>
                <div className="listing-foot">
                  <b>{Number(product.price).toLocaleString("pt-MZ")} MT</b>
                  {store && <Link to={`/lojas/${encodeURIComponent(store.slug)}`}>{store.name}</Link>}
                </div>
                {store && <p className="listing-location">{store.verified ? "Loja verificada" : "Loja pendente de verificação"} · {store.address}</p>}
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
                    className="button button-dark full-button"
                    disabled={busy}
                    onClick={() => void contactProduct(store, product)}
                  >
                    Ir para o chat
                  </button>
                )}
                {store && !store.verified && profile && profile.role !== "admin" && store.owner_id !== profile.id && (
                  <button type="button" className="button button-outline full-button" disabled title="O chat fica disponível quando a loja for verificada.">
                    Chat disponível após verificação
                  </button>
                )}
                {store?.verified && !profile && (
                  <Link className="button button-outline full-button" to="/conta">
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
  stores, query, onQueryChange, profile, busy, onStartStoreConversation
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

  async function contactStore(store: Store) {
    const conversationId = await onStartStoreConversation(
      store.id,
      `Gostaria de obter informações sobre a loja ${store.name}.`
    );
    if (conversationId) await navigate(`/mensagens/lojas/${conversationId}`);
  }

  return (
    <section className="section public-detail">
      <div className="section-head"><div><p className="eyebrow">NEGÓCIOS LOCAIS</p><h1>Lojas em Chimoio</h1><p>Encontra uma loja por nome, categoria ou localização.</p></div></div>
      <CatalogNavigation />
      <DirectoryFilters query={query} onQueryChange={onQueryChange} category={category} categories={categories} onCategoryChange={setCategory} searchLabel="Pesquisar lojas..." />
      {!filteredStores.length ? <p className="empty">Não encontrámos lojas com estes filtros.</p> : (
        <div className="catalog-grid">
          {filteredStores.map((store) => {
            const storeHref = `/lojas/${encodeURIComponent(store.slug)}`;
            const canContactStore = Boolean(
              store.verified && profile && profile.role !== "admin" && store.owner_id !== profile.id
            );
            return (
              <article className="listing-card store-card" key={store.id}>
                {store.logo_url && <Link to={storeHref}><img className="service-listing-image store-listing-logo" src={store.logo_url} alt={`Logótipo de ${store.name}`} /></Link>}
                <span className={`tag ${store.verified ? "tag-verified" : "tag-new-store"}`}>
                  {store.verified ? "Loja verificada ✓" : "Pendente de verificação"} · {parseDirectoryCategories(store.category).join(" · ")}
                </span>
                <h2><Link to={storeHref}>{store.name}</Link></h2>
                <p>{store.description}</p>
                <div className="listing-foot"><span>{store.address}</span><Link to={storeHref}>Ver loja</Link></div>
                <SharePageButton
                  title={store.name}
                  text={`Conhece a loja ${store.name} em Chimoio Boladas.`}
                  label="Partilhar loja"
                  url={`${window.location.origin}${storeHref}`}
                  imageUrl={store.logo_url ?? undefined}
                />
                {canContactStore && (
                  <button
                    type="button"
                    className="button button-dark full-button"
                    disabled={busy}
                    onClick={() => void contactStore(store)}
                  >
                    Ir para o chat
                  </button>
                )}
                {!store.verified && profile && profile.role !== "admin" && store.owner_id !== profile.id && (
                  <button type="button" className="button button-outline full-button" disabled title="O chat fica disponível quando a loja for verificada.">
                    Chat disponível após verificação
                  </button>
                )}
                {store.verified && !profile && (
                  <Link className="button button-outline full-button" to="/conta">
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
  providers, services, query, onQueryChange, profile, busy, onStartNegotiation
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
  const filteredServices = useMemo(() => {
    const term = query.trim().toLocaleLowerCase();
    return services.filter((service) => {
      const provider = providers.find((item) => item.id === service.provider_id);
      const providerCategories = parseDirectoryCategories(provider?.category);
      return (!category || service.category === category) &&
        (!term || `${service.title} ${service.description} ${service.category} ${providerCategories.join(" ")}`.toLocaleLowerCase().includes(term));
    });
  }, [category, providers, query, services]);

  return (
    <section className="section public-detail">
      <div className="section-head"><div><p className="eyebrow">PROFISSIONAIS LOCAIS</p><h1>Serviços em Chimoio</h1><p>Consulta serviços publicados e fala directamente com o prestador.</p></div></div>
      <CatalogNavigation />
      <DirectoryFilters query={query} onQueryChange={onQueryChange} category={category} categories={categories} onCategoryChange={setCategory} searchLabel="Pesquisar serviços..." />
      {!filteredServices.length ? <p className="empty">Não encontrámos serviços com estes filtros.</p> : (
        <div className="catalog-grid">
          {filteredServices.map((service) => {
            const provider = providers.find((item) => item.id === service.provider_id);
            const serviceHref = provider
              ? providerServiceHref(provider.id, service.id)
              : `/prestadores/${encodeURIComponent(service.provider_id)}`;
            return (
              <article className="listing-card service-card" key={service.id}>
                {service.images?.[0] && <Link to={serviceHref}><img className="service-listing-image" src={service.images[0]} alt={service.title} /></Link>}
                <span className="tag tag-green">{service.category}</span>
                <h2><Link to={serviceHref}>{service.title}</Link></h2>
                <p>{service.description}</p>
                <div className="listing-foot"><b>{Number(service.price).toLocaleString("pt-MZ")} MT</b><span>{service.delivery_time}</span></div>
                {provider && <Link className="detail-inline-link" to={`/prestadores/${encodeURIComponent(provider.id)}`}>Ver perfil do prestador</Link>}
                <SharePageButton
                  title={service.title}
                  text={`Conhece o serviço ${service.title} em Chimoio Boladas.`}
                  label="Partilhar serviço"
                  url={`${window.location.origin}${serviceHref}`}
                  imageUrl={service.images?.[0]}
                />
                {profile?.role === "client" && (
                  <button
                    type="button"
                    className="button button-dark full-button"
                    disabled={busy}
                    onClick={() => onStartNegotiation(service.id)}
                  >
                    Ir para o chat sobre este serviço
                  </button>
                )}
                {!profile && (
                  <Link className="button button-outline full-button" to="/conta">
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
