import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import { Link } from "react-router-dom";
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
      const storeNameSlug = storeDraft?.name
        ? storeDraft.name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "")
        : "loja";
      const filePath = `${session.user.id}/${storeNameSlug}-${crypto.randomUUID()}.${extension}`;
      
      // O primeiro segmento do caminho identifica o proprietário segundo a política do bucket.
      const { error: uploadError } = await supabase.storage
        .from("store-logos")
        .upload(filePath, file, { cacheControl: "3600", contentType: file.type, upsert: false });
      
      if (uploadError) throw uploadError;

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
    <section className="merchant-dashboard section" id="painel-lojista">
      <header className="merchant-heading">
        <div>
          <p className="eyebrow">ÁREA DO LOJISTA</p>
          <h1>{store?.name ?? "Painel da loja"}</h1>
          <p>Resumo e gestão do seu negócio num só lugar.</p>
        </div>
        {store?.logoUrl && <img className="merchant-store-logo merchant-store-logo-large" src={store.logoUrl} alt={`Logótipo de ${store.name}`} />}
        <span className={`merchant-status ${store?.verified ? "is-verified" : ""}`}>
          {store?.verified ? "Loja verificada" : "Loja não verificada"}
        </span>
      </header>

      <nav className="merchant-tabs" aria-label="Secções do painel">
        <button type="button" className={tab === "overview" ? "is-active" : ""} onClick={() => setTab("overview")}>Visão geral</button>
        <button type="button" className={tab === "store" ? "is-active" : ""} onClick={() => setTab("store")}>Dados da loja</button>
        <button type="button" className={tab === "products" ? "is-active" : ""} onClick={() => setTab("products")}>Produtos</button>
        <Link className="messages-dashboard-tab" to="/mensagens">Mensagens</Link>
      </nav>

      {error && <p className="merchant-feedback is-error" role="alert">{error}</p>}
      {message && <output className="merchant-feedback">{message}</output>}
      {loading && <output className="merchant-loading">A carregar os dados da loja...</output>}

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