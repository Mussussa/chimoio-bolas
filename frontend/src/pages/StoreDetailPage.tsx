import { useEffect, useState, type FormEvent } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import type { Session } from "@supabase/supabase-js";
import { loadPublicStore, type MerchantProduct, type PublicStoreDetail, type ReviewPayload } from "../lib/api";
import { storeProductHref } from "../lib/publicLinks";
import type { Profile } from "../lib/types";
import MapExplorer from "../components/marketplace/MapExplorer";
import ReviewForm from "../components/marketplace/ReviewForm";
import ReviewSection from "../components/marketplace/ReviewSection";
import SharePageButton from "../components/marketplace/SharePageButton";

type StoreDetailPageProps = Readonly<{
  session: Session | null;
  profile: Profile | null;
  busy: boolean;
  onReview: (review: ReviewPayload) => Promise<boolean>;
  onStartStoreConversation: (storeId: string, content: string, productId?: string) => Promise<string | null>;
}>;

export default function StoreDetailPage({ session, profile, busy, onReview, onStartStoreConversation }: StoreDetailPageProps) {
  const { slug = "" } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [detail, setDetail] = useState<PublicStoreDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedProductId, setSelectedProductId] = useState("");
  const [inquiryTopic, setInquiryTopic] = useState("");
  const linkedProductId = location.hash.startsWith("#produto-")
    ? location.hash.slice("#produto-".length)
    : "";
  const selectedProduct = detail?.products.find((product) => product.id === selectedProductId);

  useEffect(() => {
    setSelectedProductId(linkedProductId);
  }, [linkedProductId]);

  useEffect(() => {
    let active = true;
    setDetail(null);
    setError(null);
    void loadPublicStore(slug)
      .then((result) => { if (active) setDetail(result); })
      .catch((loadError: Error) => { if (active) setError(loadError.message); });
    return () => { active = false; };
  }, [slug]);

  useEffect(() => {
    if (!detail || !linkedProductId) return;
    const productCard = document.getElementById(`produto-${linkedProductId}`);
    if (!productCard) return;
    productCard.scrollIntoView({ behavior: "smooth", block: "center" });
    productCard.focus({ preventScroll: true });
  }, [detail, linkedProductId]);

  async function contactStore(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!detail) return;
    const topicLabels: Record<string, string> = {
      availability: "Gostaria de confirmar a disponibilidade",
      price: "Gostaria de confirmar o preço",
      delivery: "Gostaria de saber as opções de entrega",
      details: "Gostaria de saber mais detalhes sobre"
    };
    const content = selectedProduct
      ? `${topicLabels[inquiryTopic] ?? "Gostaria de saber mais detalhes sobre"} ${selectedProduct.name}.`
      : `Gostaria de obter informações sobre a loja ${detail.store.name}.`;
    const conversationId = await onStartStoreConversation(detail.store.id, content, selectedProduct?.id);
    if (conversationId) await navigate(`/mensagens/lojas/${conversationId}`);
  }

  async function contactProduct(product: MerchantProduct) {
    if (!detail) return;
    const conversationId = await onStartStoreConversation(
      detail.store.id,
      `Tenho interesse no produto ${product.name}.`,
      product.id
    );
    if (conversationId) await navigate(`/mensagens/lojas/${conversationId}`);
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
        <SharePageButton title={store.name} text={`Conhece a loja ${store.name} em Chimoio Boladas.`} label="Partilhar loja" />
      </header>
      <p className="public-detail-copy">{store.description}</p>
      <p className="listing-location">{store.address}</p>
      <MapExplorer stores={[mapStore]} gps={null} loading={false} error={null} />
      {session && profile && profile.role !== "admin" && profile.id !== store.ownerId && store.verified && (
        <form className="panel store-contact-form" onSubmit={(event) => void contactStore(event)}>
          <h2>Falar com {store.name}</h2>
          {products.length > 0 && (
            <label htmlFor="store-product">Produto</label>
          )}
          {products.length > 0 && (
            <select
              id="store-product"
              required
              value={selectedProductId}
              onChange={(event) => setSelectedProductId(event.target.value)}
            >
              <option value="" disabled>Escolha um produto da loja</option>
              {products.map((product) => (
                <option key={product.id} value={product.id}>
                  {product.name} · {Number(product.price).toLocaleString("pt-MZ")} MT
                </option>
              ))}
            </select>
          )}
          {selectedProduct && (
            <>
              <label htmlFor="store-inquiry-topic">O que pretende saber?</label>
              <select
                id="store-inquiry-topic"
                required
                value={inquiryTopic}
                onChange={(event) => setInquiryTopic(event.target.value)}
              >
                <option value="" disabled>Escolha um assunto</option>
                <option value="availability">Disponibilidade</option>
                <option value="price">Preço</option>
                <option value="delivery">Entrega</option>
                <option value="details">Detalhes do produto</option>
              </select>
            </>
          )}
          <button type="submit" className="button button-dark" disabled={busy}>Iniciar conversa</button>
        </form>
      )}
      {!store.verified && <p className="geo-note">Esta loja aguarda verificação; a conversa directa ficará disponível após aprovação.</p>}
      {store.verified && !session && (
        <p className="geo-note">Podes visitar e partilhar esta loja sem conta. Para avaliar ou enviar mensagem, <Link to="/conta">inicia sessão ou cria uma conta de cliente</Link>.</p>
      )}
      {store.verified && session && profile?.role === "admin" && (
        <p className="geo-note">As contas administrativas não podem iniciar conversas com lojas.</p>
      )}

      <section className="detail-section">
        <h2>Produtos da loja <span className="detail-count">{products.length}</span></h2>
        {products.length ? (
          <div className="catalog-grid">
            {products.map((product) => (
              <article
                className={`listing-card${linkedProductId === product.id ? " listing-card-highlighted" : ""}`}
                id={`produto-${product.id}`}
                key={product.id}
                tabIndex={linkedProductId === product.id ? -1 : undefined}
              >
                {product.images?.[0] && <Link to={storeProductHref(store.slug, product.id)}><img className="service-listing-image" src={product.images[0]} alt={product.name} /></Link>}
                <h3><Link to={storeProductHref(store.slug, product.id)}>{product.name}</Link></h3>
                <p>{product.description}</p>
                <div className="listing-foot">
                  <b>{Number(product.price).toLocaleString("pt-MZ")} MT</b>
                  <SharePageButton
                    title={product.name}
                    text={`${product.name} na loja ${store.name} · ${Number(product.price).toLocaleString("pt-MZ")} MT.`}
                    label="Partilhar produto"
                    url={`${window.location.origin}${storeProductHref(store.slug, product.id)}`}
                    imageUrl={product.images?.[0]}
                  />
                </div>
                {session && profile && profile.role !== "admin" && profile.id !== store.ownerId && store.verified && (
                  <button
                    type="button"
                    className="button button-dark full-button product-conversation-button"
                    disabled={busy}
                    onClick={() => void contactProduct(product)}
                  >
                    Ir para o chat
                  </button>
                )}
                {session && profile && profile.role !== "admin" && profile.id !== store.ownerId && !store.verified && (
                  <button type="button" className="button button-outline full-button" disabled title="O chat fica disponível quando a loja for verificada.">
                    Chat disponível após verificação
                  </button>
                )}
                {store.verified && !session && (
                  <Link className="button button-outline full-button" to="/conta">
                    Inicia sessão para conversar sobre este produto
                  </Link>
                )}
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
