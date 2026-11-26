import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import { Link } from "react-router-dom";
import { FiAlertCircle, FiCheckCircle, FiGrid, FiMessageCircle, FiPackage, FiShoppingBag } from "react-icons/fi";
import CategoryImage from "../components/marketplace/CategoryImage";
import { FALLBACK_IMAGE, STORE_CATEGORY_IMAGES } from "../lib/categoryPlaceholders";
import MerchantOverview from "../components/merchant/MerchantOverview";
import MerchantProductList from "../components/merchant/MerchantProductList";
import MerchantStoreForm from "../components/merchant/MerchantStoreForm";
import {
  deleteMerchantProduct,
  loadMerchantProducts,
  loadMerchantStore,
  updateMerchantProduct,
  updateMerchantStore,
  type MerchantProduct,
  type MerchantStore
} from "../lib/api";
import { supabase } from "../lib/supabase";
import { createUuid } from "../lib/uuid";
import {
  toMerchantStoreDraft,
  type MerchantProductDraft,
  type MerchantStoreDraft
} from "../components/merchant/merchantTypes";

type MerchantDashboardProps = Readonly<{
  session: Session;
  refreshKey: unknown;
  children: ReactNode;
}>;

type MerchantTab = "overview" | "store" | "products";
type StoreTextField = Exclude<keyof MerchantStoreDraft, "category">;

export default function MerchantDashboard({ session, refreshKey, children }: MerchantDashboardProps) {
  const [store, setStore] = useState<MerchantStore | null>(null);
  const [products, setProducts] = useState<MerchantProduct[]>([]);
  const [storeDraft, setStoreDraft] = useState<MerchantStoreDraft | null>(null);
  const [tab, setTab] = useState<MerchantTab>("overview");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function loadDashboard() {
    setLoading(true);
    setError(null);
    try {
      const [nextStore, nextProducts] = await Promise.all([
        loadMerchantStore(session),
        loadMerchantProducts(session)
      ]);
      setStore(nextStore);
      setStoreDraft(toMerchantStoreDraft(nextStore));
      setProducts(nextProducts);
    } catch (loadError) {
      setError((loadError as Error).message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadDashboard();
  }, [session, refreshKey]);

  function updateStoreField(field: StoreTextField, value: string) {
    setStoreDraft((current) => current ? { ...current, [field]: value } : current);
  }

  function toggleStoreCategory(category: string) {
    setStoreDraft((current) => {
      if (!current) return current;
      const categories = new Set(current.category);
      if (categories.has(category)) categories.delete(category);
      else categories.add(category);
      return { ...current, category: [...categories] };
    });
  }

  async function uploadStoreLogo(file: File): Promise<string> {
    if (!supabase) throw new Error("O serviço de fotografias está temporariamente indisponível.");
    const extensionByType: Record<string, string> = {
      "image/jpeg": "jpg",
      "image/png": "png",
      "image/webp": "webp"
    };
    const extension = extensionByType[file.type];
    if (!extension || file.size > 5 * 1024 * 1024) {
      throw new Error("O logótipo deve ser JPEG, PNG ou WebP e ter no máximo 5 MB.");
    }

    setUploadingLogo(true);
    setError(null);
    try {
      const { data: { session: storageSession }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) throw sessionError;
      if (storageSession?.user.id !== session.user.id || storageSession.access_token !== session.access_token) {
        const { error: syncError } = await supabase.auth.setSession({
          access_token: session.access_token,
          refresh_token: session.refresh_token
        });
        if (syncError) throw syncError;
      }

      const storeNameSlug = storeDraft?.name
        ? storeDraft.name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "")
        : "loja";
      const filePath = `${session.user.id}/${storeNameSlug}-${createUuid()}.${extension}`;
      
      // O primeiro segmento do caminho identifica o proprietário segundo a política do bucket.
      const { error: uploadError } = await supabase.storage
        .from("store-logos")
        .upload(filePath, file, { cacheControl: "3600", contentType: file.type, upsert: false });
      if (uploadError) {
        if (uploadError.message.toLowerCase().includes("row-level security")) {
          throw new Error("O Supabase está a bloquear o envio do logótipo. Aplica a migração 20261126130000_repair_store_logo_storage_policies.sql no projeto Supabase e tenta novamente.");
        }
        throw uploadError;
      }

      const { data } = supabase.storage.from("store-logos").getPublicUrl(filePath);
      setMessage("Logótipo carregado. Guarda as alterações para o associar à loja.");
      return data.publicUrl;
    } finally {
      setUploadingLogo(false);
    }
  }

  async function saveStore(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!storeDraft) return;
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const result = await updateMerchantStore(session, {
        ...storeDraft,
        latitude: storeDraft.latitude.trim() ? Number(storeDraft.latitude) : null,
        longitude: storeDraft.longitude.trim() ? Number(storeDraft.longitude) : null,
        logoUrl: storeDraft.logoUrl.trim() || null
      });
      setStore(result.store);
      setStoreDraft(toMerchantStoreDraft(result.store));
      setMessage("Dados da loja atualizados.");
    } catch (saveError) {
      setError((saveError as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function saveProduct(product: MerchantProduct, draft: MerchantProductDraft): Promise<boolean> {
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const result = await updateMerchantProduct(session, { ...product, ...draft });
      setProducts((current) => current.map((item) => item.id === product.id ? result.product : item));
      setMessage("Produto atualizado.");
      return true;
    } catch (saveError) {
      setError((saveError as Error).message);
      return false;
    } finally {
      setSaving(false);
    }
  }

  async function removeProduct(product: MerchantProduct) {
    if (!window.confirm(`Remover “${product.name}” da loja?`)) return;
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      await deleteMerchantProduct(session, product.id);
      setProducts((current) => current.filter((item) => item.id !== product.id));
      setMessage("Produto removido.");
    } catch (removeError) {
      setError((removeError as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="min-h-[calc(100vh-160px)] px-[clamp(20px,7vw,100px)] pt-11 pb-[70px] max-[560px]:pb-12" id="painel-lojista">
      <header className="flex flex-col items-start justify-between gap-5 border-b border-[#e7e1ca] pb-6 min-[561px]:flex-row min-[561px]:items-center">
        <div>
          <p className="mb-1 text-[10px] font-extrabold tracking-[.17em] text-[#765900]">ÁREA DO LOJISTA</p>
          <h1 className="my-2 font-[Manrope,sans-serif] text-[32px] font-extrabold text-[#302b18] max-[560px]:text-[27px]">{store?.name ?? "Painel da loja"}</h1>
          <p className="m-0 text-[13px] text-[#716e60]">Resumo e gestão do seu negócio num só lugar.</p>
        </div>
        {store && <CategoryImage className="h-[82px] w-[82px] shrink-0 rounded-lg border border-[#e7e1ca] bg-[#f5f8f9] object-cover" src={store.logoUrl} placeholder={STORE_CATEGORY_IMAGES[store.category[0]] ?? FALLBACK_IMAGE} alt={`Logótipo de ${store.name}`} />}
        <span className={`rounded-md px-[11px] py-2 text-[11px] font-bold ${store?.verified ? "bg-[#e6f4ec] text-[#267155]" : "bg-[#fff3da] text-[#885a1c]"}`}>
          <span className="inline-flex items-center gap-1.5">{store?.verified ? <FiCheckCircle aria-hidden="true" /> : <FiShoppingBag aria-hidden="true" />}{store?.verified ? "Loja verificada" : "Loja não verificada"}</span>
        </span>
      </header>

      <nav className="my-5 mb-6 flex gap-6 overflow-x-auto border-b border-[#e7e1ca] max-[560px]:gap-[15px]" aria-label="Secções do painel">
        <button type="button" aria-pressed={tab === "overview"} className={`inline-flex shrink-0 items-center gap-1.5 border-0 border-b-2 border-transparent bg-transparent px-0.5 pb-3 text-[13px] font-bold max-[560px]:text-xs ${tab === "overview" ? "border-b-[#765900] text-[#765900]" : "text-[#716e60]"}`} onClick={() => setTab("overview")}><FiGrid aria-hidden="true" />Visão geral</button>
        <button type="button" aria-pressed={tab === "store"} className={`inline-flex shrink-0 items-center gap-1.5 border-0 border-b-2 border-transparent bg-transparent px-0.5 pb-3 text-[13px] font-bold max-[560px]:text-xs ${tab === "store" ? "border-b-[#765900] text-[#765900]" : "text-[#716e60]"}`} onClick={() => setTab("store")}><FiShoppingBag aria-hidden="true" />Dados da loja</button>
        <button type="button" aria-pressed={tab === "products"} className={`inline-flex shrink-0 items-center gap-1.5 border-0 border-b-2 border-transparent bg-transparent px-0.5 pb-3 text-[13px] font-bold max-[560px]:text-xs ${tab === "products" ? "border-b-[#765900] text-[#765900]" : "text-[#716e60]"}`} onClick={() => setTab("products")}><FiPackage aria-hidden="true" />Produtos</button>
        <Link className="ml-auto inline-flex shrink-0 items-center gap-1.5 border-b-2 border-transparent px-0.5 pb-3 text-[13px] font-bold text-[#765900] hover:border-b-[#9abbd0] max-[560px]:text-xs" to="/mensagens"><FiMessageCircle aria-hidden="true" />Mensagens</Link>
      </nav>

      {error && <p className="my-[14px] flex items-start gap-2 rounded-md bg-[#fff0ec] px-[14px] py-3 text-[13px] text-[#9e3b2e]" role="alert"><FiAlertCircle className="mt-0.5 flex-none" aria-hidden="true" />{error}</p>}
      {message && <output className="my-[14px] flex items-center gap-2 rounded-md bg-[#eaf5ef] px-[14px] py-3 text-[13px] text-[#267155]"><FiCheckCircle aria-hidden="true" />{message}</output>}
      {loading && <output className="my-[14px] flex items-center gap-2 rounded-md bg-[#eaf5ef] px-[14px] py-3 text-[13px] text-[#267155]" aria-live="polite"><FiShoppingBag aria-hidden="true" />A carregar os dados da loja...</output>}

      {!loading && store && tab === "overview" && (
        <MerchantOverview
          store={store}
          products={products}
          onEditStore={() => setTab("store")}
          onManageProducts={() => setTab("products")}
        />
      )}

      {!loading && store && storeDraft && tab === "store" && (
        <MerchantStoreForm
          draft={storeDraft}
          saving={saving}
          uploadingLogo={uploadingLogo}
          onSubmit={saveStore}
          onFieldChange={updateStoreField}
          onToggleCategory={toggleStoreCategory}
          onUploadLogo={uploadStoreLogo}
        />
      )}

      {!loading && store && tab === "products" && (
        <MerchantProductList
          products={products}
          saving={saving}
          onRefresh={() => void loadDashboard()}
          onSaveProduct={saveProduct}
          onDeleteProduct={(product) => void removeProduct(product)}
        >
          {children}
        </MerchantProductList>
      )}
    </section>
  );
}