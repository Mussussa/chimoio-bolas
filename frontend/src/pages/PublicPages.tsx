import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import type { Session } from "@supabase/supabase-js";
import {
  loadPublicProduct,
  loadPublicProvider,
  loadPublicStore,
  type PublicProductDetail,
  type PublicProviderDetail,
  type PublicReview,
  type PublicStoreDetail,
  type StoreConversation
} from "../lib/api";
import type { Profile, Service, ServiceProvider, Store } from "../lib/types";
import MapExplorer from "../components/marketplace/MapExplorer";
import ReviewForm from "../components/marketplace/ReviewForm";
import type { ReviewPayload } from "../lib/api";
import type { StoreConversationMessage } from "../lib/api";

type PublicPageProps = Readonly<{
  session: Session | null;
  profile: Profile | null;
  busy: boolean;
}>;

type ReviewPageProps = PublicPageProps & Readonly<{
  onReview: (review: ReviewPayload) => Promise<boolean>;
}>;

type StoreContactProps = PublicPageProps & Readonly<{
  onStartStoreConversation: (storeId: string, content: string, productId?: string) => Promise<string | null>;
}>;

export function StoreDetailPage({ session, profile, busy, onReview, onStartStoreConversation }: StoreContactProps & ReviewPageProps) {
  const { slug = "" } = useParams();
  const navigate = useNavigate();
  const [detail, setDetail] = useState<PublicStoreDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    let active = true;
    setDetail(null);
    setError(null);
    void loadPublicStore(slug)
      .then((result) => { if (active) setDetail(result); })
      .catch((loadError: Error) => { if (active) setError(loadError.message); });
    return () => { active = false; };
  }, [slug]);

  async function contactStore(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!detail) return;
    const conversationId = await onStartStoreConversation(detail.store.id, message);
    if (conversationId) await navigate(`/conversas/${conversationId}`);
  }

  if (error) return <section className="section"><p className="empty">{error} <Link to="/">Voltar ao catálogo</Link></p></section>;
  if (!detail) return <section className="section"><p className="empty">A carregar loja...</p></section>;
  const { store, products, reviews } = detail;
  const mapStore = {
    id: store.id,
    name: store.name,
    category: store.category,
    address: store.address,
    latitude: store.latitude,
    longitude: store.longitude,
    verified: store.verified
  };

  return (
    <article className="section public-detail">
      <Link to="/" className="detail-back">← Voltar a explorar</Link>
      <header className="public-detail-heading">
        {store.logoUrl && <img className="store-detail-logo" src={store.logoUrl} alt={`Logótipo de ${store.name}`} />}
        <div>
          <span className={`tag ${store.verified ? "tag-verified" : "tag-new-store"}`}>
            {store.verified ? "Loja verificada ✓" : "Pendente de verificação"}
          </span>
          <h1>{store.name}</h1>
          <p>{store.category.join(" · ")}</p>
        </div>
      </header>
      <p className="public-detail-copy">{store.description}</p>
      <p className="listing-location">{store.address}</p>
      <MapExplorer stores={[mapStore]} gps={null} loading={false} error={null} />
      {profile?.role === "client" && store.verified && (
        <form className="panel store-contact-form" onSubmit={(event) => void contactStore(event)}>
          <h2>Falar com a loja</h2>
          <label htmlFor="store-message">A tua mensagem</label>
          <textarea id="store-message" required maxLength={4000} value={message} onChange={(event) => setMessage(event.target.value)} placeholder="Pergunta sobre disponibilidade, entrega ou detalhes..." />
          <button className="button button-dark" disabled={busy}>Iniciar conversa</button>
        </form>
      )}
      {!store.verified && <p className="geo-note">Esta loja aguarda verificação; a conversa directa ficará disponível após aprovação.</p>}
      {!session && store.verified && <p className="geo-note">Para conversar com a loja, <Link to="/conta">inicia sessão como cliente</Link>.</p>}

      <section className="detail-section">
        <h2>Produtos da loja <span className="detail-count">{products.length}</span></h2>
        {products.length ? (
          <div className="catalog-grid">
            {products.map((product) => (
              <article className="listing-card" key={product.id}>
                {product.images?.[0] && <Link to={`/produtos/${product.id}`}><img className="service-listing-image" src={product.images[0]} alt={product.name} /></Link>}
                <h3><Link to={`/produtos/${product.id}`}>{product.name}</Link></h3>
                <p>{product.description}</p>
                <div className="listing-foot"><b>{Number(product.price).toLocaleString("pt-MZ")} MT</b><Link to={`/produtos/${product.id}`}>Ver produto</Link></div>
              </article>
            ))}
          </div>
        ) : <p className="empty">Esta loja ainda não publicou produtos.</p>}
      </section>
      <ReviewSection reviews={reviews} />
      {profile?.role === "client" && store.verified && <ReviewForm targetType="store" targetId={store.id} targetName={store.name} busy={busy} onSubmit={onReview} />}
    </article>
  );
}

export function ProductDetailPage({ session, profile, busy, onStartStoreConversation }: StoreContactProps) {
  const { productId = "" } = useParams();
  const navigate = useNavigate();
  const [detail, setDetail] = useState<PublicProductDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    let active = true;
    setDetail(null);
    setError(null);
    void loadPublicProduct(productId)
      .then((result) => { if (active) setDetail(result); })
      .catch((loadError: Error) => { if (active) setError(loadError.message); });
    return () => { active = false; };
  }, [productId]);

  async function contactStore(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!detail) return;
    const conversationId = await onStartStoreConversation(detail.store.id, message, detail.product.id);
    if (conversationId) await navigate(`/conversas/${conversationId}`);
  }

  if (error) return <section className="section"><p className="empty">{error} <Link to="/">Voltar ao catálogo</Link></p></section>;
  if (!detail) return <section className="section"><p className="empty">A carregar produto...</p></section>;
  const { product, store } = detail;

  return (
    <article className="section public-detail product-detail">
      <Link to={`/lojas/${store.slug}`} className="detail-back">← {store.name}</Link>
      <div className="product-detail-layout">
        {product.images?.[0] && <img className="product-detail-image" src={product.images[0]} alt={product.name} />}
        <div>
          <span className="tag">PRODUTO · {product.category}</span>
          {!store.verified && <span className="tag tag-new-store">Loja pendente de verificação</span>}
          <h1>{product.name}</h1>
          <p className="product-detail-price">{Number(product.price).toLocaleString("pt-MZ")} MT</p>
          <p>{product.description}</p>
          {product.minOrderQty > 1 && <p>Quantidade mínima: {product.minOrderQty}</p>}
          <p>Vendido por <Link to={`/lojas/${store.slug}`}><b>{store.name}</b></Link> · {store.address}</p>
          {profile?.role === "client" && store.verified && (
            <form className="store-contact-form" onSubmit={(event) => void contactStore(event)}>
              <label htmlFor="product-message">Perguntar à loja sobre este produto</label>
              <textarea id="product-message" required maxLength={4000} value={message} onChange={(event) => setMessage(event.target.value)} placeholder={`Olá, gostaria de saber mais sobre ${product.name}...`} />
              <button className="button button-dark" disabled={busy}>Conversar com a loja</button>
            </form>
          )}
          {!store.verified && <p className="geo-note">A loja aguarda verificação; o contacto directo ficará disponível após aprovação.</p>}
          {!session && store.verified && <p className="geo-note"><Link to="/conta">Inicia sessão como cliente</Link> para conversar com a loja.</p>}
        </div>
      </div>
    </article>
  );
}

export function ProviderDetailPage({
  profile, busy, onReview, onStartNegotiation
}: ReviewPageProps & Readonly<{ onStartNegotiation: (serviceId: string) => void }>) {
  const { providerId = "" } = useParams();
  const [detail, setDetail] = useState<PublicProviderDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setDetail(null);
    setError(null);
    void loadPublicProvider(providerId)
      .then((result) => { if (active) setDetail(result); })
      .catch((loadError: Error) => { if (active) setError(loadError.message); });
    return () => { active = false; };
  }, [providerId]);

  if (error) return <section className="section"><p className="empty">{error} <Link to="/">Voltar ao catálogo</Link></p></section>;
  if (!detail) return <section className="section"><p className="empty">A carregar perfil do prestador...</p></section>;
  const { provider, profile: providerProfile, services, reviews } = detail;

  return (
    <article className="section public-detail">
      <Link to="/" className="detail-back">← Voltar a explorar</Link>
      <header className="public-detail-heading">
        {providerProfile?.avatarUrl && <img className="provider-detail-avatar" src={providerProfile.avatarUrl} alt="" />}
        <div>
          <span className="tag tag-green">{provider.verified ? "Prestador verificado ✓" : "Prestador na plataforma"}</span>
          <h1>{providerProfile?.name ?? "Prestador de serviços"}</h1>
          <p>{provider.category.join(" · ")}</p>
        </div>
      </header>
      <p className="public-detail-copy">{provider.bio}</p>
      <p>Preço base: <b>{Number(provider.basePrice).toLocaleString("pt-MZ")} MT</b></p>
      <section className="detail-section">
        <h2>Serviços publicados <span className="detail-count">{services.length}</span></h2>
        {services.length ? (
          <div className="catalog-grid">
            {services.map((service) => (
              <article className="listing-card service-card" key={service.id}>
                {service.images?.[0] && <img className="service-listing-image" src={service.images[0]} alt={service.title} />}
                <h3>{service.title}</h3>
                <p>{service.description}</p>
                <div className="listing-foot"><b>{Number(service.price).toLocaleString("pt-MZ")} MT</b><span>{service.deliveryTime}</span></div>
                {profile?.role === "client" && <button className="button button-dark full-button" disabled={busy} onClick={() => onStartNegotiation(service.id)}>Iniciar negociação</button>}
              </article>
            ))}
          </div>
        ) : <p className="empty">Este prestador ainda não publicou serviços.</p>}
      </section>
      <ReviewSection reviews={reviews} />
      {profile?.role === "client" && <ReviewForm targetType="service_provider" targetId={provider.id} targetName={providerProfile?.name ?? "prestador"} busy={busy} onSubmit={onReview} />}
    </article>
  );
}

export function StoresDirectoryPage({ stores }: { stores: Store[] }) {
  return (
    <section className="section public-detail">
      <Link to="/" className="detail-back">← Voltar a explorar</Link>
      <div className="section-head"><div><p className="eyebrow">NEGÓCIOS LOCAIS</p><h1>Lojas em Chimoio</h1><p>Explora lojas verificadas, produtos e localização.</p></div></div>
      {!stores.length ? <p className="empty">Ainda não há lojas verificadas.</p> : (
        <div className="catalog-grid">
          {stores.map((store) => (
            <article className="listing-card store-card" key={store.id}>
              {store.logo_url && <Link to={`/lojas/${store.slug}`}><img className="service-listing-image store-listing-logo" src={store.logo_url} alt={`Logótipo de ${store.name}`} /></Link>}
              <span className="tag tag-verified">Loja verificada ✓</span>
              <h2><Link to={`/lojas/${store.slug}`}>{store.name}</Link></h2>
              <p>{store.description}</p>
              <div className="listing-foot"><span>{store.address}</span><Link to={`/lojas/${store.slug}`}>Ver loja</Link></div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

export function ServicesDirectoryPage({
  providers,
  services
}: {
  providers: ServiceProvider[];
  services: Service[];
}) {
  return (
    <section className="section public-detail">
      <Link to="/" className="detail-back">← Voltar a explorar</Link>
      <div className="section-head"><div><p className="eyebrow">PROFISSIONAIS LOCAIS</p><h1>Serviços em Chimoio</h1><p>Consulta serviços publicados e fala directamente com o prestador.</p></div></div>
      {!services.length ? <p className="empty">Ainda não há serviços publicados.</p> : (
        <div className="catalog-grid">
          {services.map((service) => {
            const provider = providers.find((item) => item.id === service.provider_id);
            return (
              <article className="listing-card service-card" key={service.id}>
                {service.images?.[0] && <Link to={`/prestadores/${service.provider_id}`}><img className="service-listing-image" src={service.images[0]} alt={service.title} /></Link>}
                <span className="tag tag-green">{service.category}</span>
                <h2><Link to={`/prestadores/${service.provider_id}`}>{service.title}</Link></h2>
                <p>{service.description}</p>
                <div className="listing-foot"><b>{Number(service.price).toLocaleString("pt-MZ")} MT</b><span>{service.delivery_time}</span></div>
                {provider && <Link className="detail-inline-link" to={`/prestadores/${provider.id}`}>Ver perfil do prestador</Link>}
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}

type StoreConversationPageProps = Readonly<{
  session: Session | null;
  profile: Profile | null;
  conversations: StoreConversation[];
  messages: StoreConversationMessage[];
  message: string;
  busy: boolean;
  onMessageChange: (value: string) => void;
  onOpen: (conversationId: string) => void;
  onSend: (event: FormEvent<HTMLFormElement>, conversationId: string) => void;
}>;

export function StoreConversationPage({
  session, profile, conversations, messages, message, busy, onMessageChange, onOpen, onSend
}: StoreConversationPageProps) {
  const { conversationId } = useParams();
  const navigate = useNavigate();
  useEffect(() => {
    if (conversationId) onOpen(conversationId);
  }, [conversationId, onOpen]);
  useEffect(() => {
    if (!conversationId) return;
    const timer = window.setInterval(() => onOpen(conversationId), 5000);
    return () => window.clearInterval(timer);
  }, [conversationId, onOpen]);

  if (!session) {
    return <section className="section"><p className="empty">Inicia sessão para consultar as conversas com lojas. <Link to="/conta">Entrar</Link></p></section>;
  }
  const selected = conversations.find((item) => item.id === conversationId) ?? null;

  return (
    <section className="section conversation-center">
      <div className="section-head"><div><p className="eyebrow">CONTACTO DIRECTO</p><h1>Conversas com lojas</h1><p>Mensagens sobre produtos e lojas locais.</p></div></div>
      <div className="conversation-layout">
        <aside className="conversation-list" aria-label="Lista de conversas">
          {!conversations.length && <p className="empty">Ainda não tens conversas com lojas.</p>}
          {conversations.map((conversation) => {
            const lastMessage = conversation.messages[0];
            const otherParty = profile?.role === "lojista" ? lastMessage?.sender?.name ?? "Cliente" : conversation.store.name;
            return (
              <button
                type="button"
                key={conversation.id}
                className={`conversation-list-item ${conversation.id === conversationId ? "is-active" : ""}`}
                onClick={() => { onOpen(conversation.id); void navigate(`/conversas/${conversation.id}`); }}
              >
                <b>{otherParty}</b>
                <span>{conversation.product?.name ?? "Conversa com a loja"}</span>
                <small>{lastMessage?.content ?? "Sem mensagens"}</small>
              </button>
            );
          })}
        </aside>
        <div className="conversation-thread">
          {!selected ? <p className="empty">Escolhe uma conversa para ver as mensagens.</p> : (
            <>
              <header><b>{profile?.role === "lojista" ? "Conversa com cliente" : selected.store.name}</b><span>{selected.product?.name ?? selected.store.name}</span></header>
              <div className="store-chat-messages">
                {messages.map((item) => (
                  <article className={`store-chat-message ${item.senderId === profile?.id ? "mine" : ""}`} key={item.id}>
                    <b>{item.sender?.name ?? (item.senderId === profile?.id ? "Tu" : "Participante")}</b>
                    <p>{item.content}</p>
                    <time>{new Date(item.createdAt).toLocaleString("pt-MZ")}</time>
                  </article>
                ))}
              </div>
              <form className="store-chat-form" onSubmit={(event) => onSend(event, selected.id)}>
                <textarea required maxLength={4000} value={message} onChange={(event) => onMessageChange(event.target.value)} placeholder="Escreve uma mensagem..." />
                <button className="button button-dark" disabled={busy}>Enviar</button>
              </form>
            </>
          )}
        </div>
      </div>
    </section>
  );
}

function ReviewSection({ reviews }: { reviews: PublicReview[] }) {
  if (!reviews.length) return <section className="detail-section"><h2>Avaliações</h2><p className="empty">Ainda não há avaliações.</p></section>;
  const average = reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length;
  return (
    <section className="detail-section">
      <h2>Avaliações <span className="detail-rating">★ {average.toFixed(1)} ({reviews.length})</span></h2>
      <div className="review-list">
        {reviews.map((review) => (
          <article className="review-item" key={review.id}>
            <b>{"★".repeat(review.rating)}{"☆".repeat(5 - review.rating)}</b>
            {review.comment && <p>{review.comment}</p>}
            <time>{new Date(review.createdAt).toLocaleDateString("pt-MZ")}</time>
          </article>
        ))}
      </div>
    </section>
  );
}
