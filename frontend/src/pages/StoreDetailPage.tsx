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
import CategoryImage from "../components/marketplace/CategoryImage";
import { FALLBACK_IMAGE, STORE_CATEGORY_IMAGES } from "../lib/categoryPlaceholders";

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

  if (error) return <section className="px-[clamp(20px,7vw,100px)] py-[70px] max-[560px]:py-12"><p className="col-span-full rounded-[10px] border border-dashed border-[#cbd8de] p-6 text-center text-[13px] text-[#716e60]">{error} <Link className="font-bold text-[#765900] underline" to="/">Voltar ao catálogo</Link></p></section>;
  if (!detail) return <section className="px-[clamp(20px,7vw,100px)] py-[70px] max-[560px]:py-12"><p className="col-span-full rounded-[10px] border border-dashed border-[#cbd8de] p-6 text-center text-[13px] text-[#716e60]">A carregar loja...</p></section>;
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
    <article className="min-h-[65vh] px-[clamp(20px,7vw,100px)] py-[70px] max-[560px]:py-12">
      <Link to="/" className="mb-5 inline-block text-[13px] font-bold text-[#765900]">← Voltar a explorar</Link>
      <header className="my-2 flex flex-col items-start gap-[22px] min-[561px]:flex-row min-[561px]:items-center">
        <CategoryImage className="h-[100px] w-[100px] rounded-[14px] bg-[#eaf1f4] object-cover" src={store.logoUrl} placeholder={STORE_CATEGORY_IMAGES[store.category[0]] ?? FALLBACK_IMAGE} alt={`Logótipo de ${store.name}`} />
        <div>
          <span className={`inline-flex rounded-[5px] px-2 py-1.5 text-[9px] font-extrabold tracking-[.08em] ${store.verified ? "bg-[#e6f4ec] text-[#286f58]" : "bg-[#edf1f3] text-[#5f6d76]"}`}>
            {store.verified ? "Loja verificada ✓" : "Loja não verificada"}
          </span>
          <h1 className="my-3 text-[clamp(28px,4vw,42px)] font-extrabold leading-tight tracking-[-.04em]">{store.name}</h1>
          <p className="text-[#716e60]">{store.category.join(" · ")}</p>
        </div>
        <SharePageButton title={store.name} text={`Conhece a loja ${store.name} na YELLOW, em Chimoio.`} label="Partilhar loja" />
      </header>
      <p className="max-w-[760px] leading-[1.75] text-[#536978]">{store.description}</p>
      <p className="mb-0 mt-[10px] text-[11px] text-[#716e60]">{store.address}</p>
      <MapExplorer stores={[mapStore]} gps={null} loading={false} error={null} />
      {session && profile && profile.role !== "admin" && profile.id !== store.ownerId && (
        <form className="my-6 grid max-w-[760px] items-start gap-3 rounded-xl border border-[#e7e1ca] bg-white p-[26px]" onSubmit={(event) => void contactStore(event)}>
          <h2 className="font-[Manrope,sans-serif] text-2xl font-extrabold">Falar com {store.name}</h2>
          {products.length > 0 && (
            <label className="text-xs font-bold text-[#716e60]" htmlFor="store-product">Produto</label>
          )}
          {products.length > 0 && (
            <select
              className="w-full max-w-[620px]"
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
              <label className="text-xs font-bold text-[#716e60]" htmlFor="store-inquiry-topic">O que pretende saber?</label>
              <select
                className="w-full max-w-[620px]"
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
          <button type="submit" className="inline-flex min-h-[42px] items-center justify-self-start justify-center gap-[9px] rounded-lg border-0 bg-[#302b18] px-[17px] text-[12px] font-bold text-white transition-[transform,background-color] duration-[160ms] hover:-translate-y-px hover:bg-[#ffd21a] hover:text-[#302b18] disabled:cursor-wait disabled:opacity-[.56]" disabled={busy}>Iniciar conversa</button>
        </form>
      )}
      {!session && (
        <p className="rounded-[7px] bg-[#eaf5ef] px-3 py-2.5 text-xs text-[#2e715d]">Podes visitar e partilhar esta loja sem conta. Para avaliar ou enviar mensagem, <Link className="font-bold text-[#765900]" to="/conta">inicia sessão ou cria uma conta de cliente</Link>.</p>
      )}
      {session && profile?.role === "admin" && (
        <p className="rounded-[7px] bg-[#eaf5ef] px-3 py-2.5 text-xs text-[#2e715d]">As contas administrativas não podem iniciar conversas com lojas.</p>
      )}

      <section className="mt-10">
        <h2 className="font-[Manrope,sans-serif] text-2xl font-extrabold">Produtos da loja <span className="ml-1.5 inline-grid h-6 min-w-6 place-items-center rounded-full bg-[#fff7d6] align-middle text-[12px] font-bold text-[#765900]">{products.length}</span></h2>
        {products.length ? (
          <div className="grid grid-cols-1 gap-[15px] min-[561px]:grid-cols-2 min-[851px]:grid-cols-3">
            {products.map((product) => (
              <article
                className={`min-h-[206px] rounded-xl border border-[#e7e1ca] bg-white p-[22px] shadow-[0_8px_18px_#16354a08] ${linkedProductId === product.id ? "scroll-mt-[100px] border-[#ffd21a] shadow-[0_0_0_4px_#ffd21a40,0_12px_24px_#16354a12] animate-[product-highlight_1.8s_ease-out]" : ""}`}
                id={`produto-${product.id}`}
                key={product.id}
                tabIndex={linkedProductId === product.id ? -1 : undefined}
              >
                <Link to={storeProductHref(store.slug, product.id)}><CategoryImage className="my-3 block aspect-video w-full rounded-md bg-[#eef2f4] object-cover" src={product.images?.[0]} placeholder={STORE_CATEGORY_IMAGES[product.category] ?? FALLBACK_IMAGE} alt={product.name} /></Link>
                <h3 className="mb-2 mt-[13px] font-[Manrope,sans-serif] text-[17px] font-bold"><Link to={storeProductHref(store.slug, product.id)}>{product.name}</Link></h3>
                <p className="text-[13px] leading-[1.6] text-[#716e60]">{product.description}</p>
                <div className="flex items-center justify-between gap-3 text-[11px] text-[#758590]">
                  <b className="whitespace-nowrap text-[15px] text-[#302b18]">{Number(product.price).toLocaleString("pt-MZ")} MT</b>
                  <SharePageButton
                    title={product.name}
                    text={`${product.name} na loja ${store.name} · ${Number(product.price).toLocaleString("pt-MZ")} MT.`}
                    label="Partilhar produto"
                    url={`${window.location.origin}${storeProductHref(store.slug, product.id)}`}
                    imageUrl={product.images?.[0]}
                  />
                </div>
                {session && profile && profile.role !== "admin" && profile.id !== store.ownerId && (
                  <button
                    type="button"
                    className="mt-3 inline-flex min-h-[42px] w-full items-center justify-center gap-[9px] rounded-lg border-0 bg-[#302b18] px-[17px] text-[12px] font-bold text-white transition-[transform,background-color] duration-[160ms] hover:-translate-y-px hover:bg-[#ffd21a] hover:text-[#302b18] disabled:cursor-wait disabled:opacity-[.56]"
                    disabled={busy}
                    onClick={() => void contactProduct(product)}
                  >
                    Ir para o chat
                  </button>
                )}
                {!session && (
                  <Link className="mt-[15px] inline-flex min-h-[42px] w-full items-center justify-center gap-[9px] rounded-lg border border-[#c8d6dd] bg-white px-[17px] text-[12px] font-bold text-[#302b18]" to="/conta">
                    Inicia sessão para conversar sobre este produto
                  </Link>
                )}
              </article>
            ))}
          </div>
        ) : <p className="col-span-full rounded-[10px] border border-dashed border-[#cbd8de] p-6 text-center text-[13px] text-[#716e60]">Esta loja ainda não publicou produtos.</p>}
      </section>
      <ReviewSection reviews={reviews} />
      {profile?.role === "client" && <ReviewForm targetType="store" targetId={store.id} targetName={store.name} busy={busy} onSubmit={onReview} />}
    </article>
  );
}
