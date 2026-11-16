import { useState, type FormEvent } from "react";
import type { Session } from "@supabase/supabase-js";
import type { ProductForm, Profile, ProviderForm, StoreForm } from "../../lib/types";
import { CHIMOIO_NEIGHBORHOODS } from "../../lib/chimoioNeighborhoods";
import { STORE_CATEGORIES } from "../merchant/merchantTypes";
import { PROVIDER_CATEGORIES as SERVICE_CATEGORIES } from "../provider/providerTypes";
import { supabase } from "../../lib/supabase";

type WorkspaceProps = Readonly<{
  session: Session;
  profile: Profile;
  busy: boolean;
  onRegisterStore: (event: FormEvent<HTMLFormElement>, store: StoreForm & { neighborhood?: string }) => Promise<boolean>;
  onCreateProduct: (event: FormEvent<HTMLFormElement>, product: ProductForm & { images?: string[] }) => Promise<boolean>;
  onRegisterProvider: (event: FormEvent<HTMLFormElement>, provider: ProviderForm) => Promise<boolean>;
}>;

const initialProviderForm: ProviderForm = { category: [], bio: "", basePrice: "" };
const initialStoreForm: StoreForm & { neighborhood?: string } = {
  name: "",
  slug: "",
  category: [],
  description: "",
  address: "",
  latitude: "-19.1164",
  longitude: "33.4833",
  neighborhood: ""
};
const initialProductForm: ProductForm = { name: "", description: "", price: "", category: "" };

// Função para converter o nome da loja num slug de URL limpo
function generateSlug(text: string) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export default function Workspace({
  session,
  profile,
  busy,
  onRegisterStore,
  onCreateProduct,
  onRegisterProvider
}: WorkspaceProps) {
  const [gpsEnabled, setGpsEnabled] = useState(false);
  const [providerForm, setProviderForm] = useState<ProviderForm>(initialProviderForm);
  const [storeForm, setStoreForm] = useState<StoreForm & { neighborhood?: string }>(initialStoreForm);
  const [productForm, setProductForm] = useState<ProductForm>(initialProductForm);
  
  // Estado local para gerir a fotografia do produto
  const [productImageFile, setProductImageFile] = useState<File | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const productCategories = profile.store?.category ?? [];

  // Manipulação de seleção múltipla de categorias (Store e Provider)
  const toggleStoreCategory = (cat: string) => {
    const current = Array.isArray(storeForm.category) ? storeForm.category : [];
    const updated = current.includes(cat)
      ? current.filter((c: string) => c !== cat)
      : [...current, cat];
    setStoreForm((prev) => ({ ...prev, category: updated }));
  };

  const toggleProviderCategory = (cat: string) => {
    const current = Array.isArray(providerForm.category) ? providerForm.category : [];
    const updated = current.includes(cat)
      ? current.filter((c: string) => c !== cat)
      : [...current, cat];
    setProviderForm((prev) => ({ ...prev, category: updated }));
  };

  const handleNeighborhoodChange = (neighborhoodName: string) => {
    const found = CHIMOIO_NEIGHBORHOODS.find((n) => n.name === neighborhoodName);
    setStoreForm((current) => ({
      ...current,
      neighborhood: neighborhoodName,
      address: neighborhoodName && neighborhoodName !== "Outro / Periferia de Chimoio" 
        ? `Bairro ${neighborhoodName}` 
        : current.address,
      latitude: found ? found.latitude.toFixed(6) : current.latitude,
      longitude: found ? found.longitude.toFixed(6) : current.longitude
    }));
  };

  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      alert("O seu navegador não suporta localização GPS.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setStoreForm((current) => ({
          ...current,
          latitude: position.coords.latitude.toFixed(6),
          longitude: position.coords.longitude.toFixed(6)
        }));
        setGpsEnabled(true);
      },
      (error) => {
        console.warn("Acesso ao GPS recusado ou indisponível:", error.message);
        alert("Não foi possível aceder ao GPS. Certifique-se de que permitiu o acesso à localização no seu navegador.");
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  // Função customizada para submeter o produto com o upload da imagem para o Supabase Storage
  const handleProductSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!productImageFile) {
      alert("Por favor, selecione uma fotografia para o produto.");
      return;
    }
    if (!supabase) {
      alert("O serviço de fotografias está temporariamente indisponível. Tenta novamente mais tarde.");
      return;
    }

    setUploadingImage(true);
    try {
      // 1. Faz o upload direto para o Supabase Storage (Bucket 'products')
      const extensionByType: Record<string, string> = {
        "image/jpeg": "jpg",
        "image/png": "png",
        "image/webp": "webp"
      };
      const fileExt = extensionByType[productImageFile.type];
      if (!fileExt || productImageFile.size > 5 * 1024 * 1024) {
        throw new Error("A fotografia deve ser JPEG, PNG ou WebP e ter até 5 MB.");
      }
      const filePath = `${session.user.id}/product-images/${crypto.randomUUID()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("products")
        .upload(filePath, productImageFile, { cacheControl: "3600", contentType: productImageFile.type, upsert: false });
      if (uploadError) throw uploadError;

      // 2. Obtém a URL pública oficial da imagem
      const { data: publicURLData } = supabase.storage
        .from("products")
        .getPublicUrl(filePath);

      const imageUrl = publicURLData.publicUrl;

      // 3. Atualiza o estado do produto passando 'images' estritamente como array (exigido pelo backend)
      const finalPayload = {
        ...productForm,
        images: [imageUrl] // O esquema Joi do backend espera 'images' como array
      };

      // 4. Submete para o backend
      const created = await onCreateProduct(event, finalPayload);
      if (created) setProductForm(initialProductForm);
      setProductImageFile(null);
    } catch (error) {
      alert(`Não foi possível carregar a fotografia do produto: ${(error as Error).message}`);
    } finally {
      setUploadingImage(false);
    }
  };

  return (
    <section className="section workspace">
      {profile.role === "client" && (
        <div className="panel">
          <div className="section-head">
            <div>
              <p className="eyebrow">ABRIR NEGÓCIO (PLANO 2: PRODUTOS)</p>
              <h2>Registar loja local em Chimoio</h2>
            </div>
          </div>
          <form className="form-grid" onSubmit={(event) => void onRegisterStore(event, storeForm)}>
            {/* O slug é gerado e enviado automaticamente em segundo plano */}
            <input type="hidden" value={storeForm.slug} />

            <label className="wide">
              Nome da loja ou negócio
              <input 
                required 
                maxLength={160} 
                placeholder="Ex.: Mercearia Central, Electro Chimoio"
                value={storeForm.name} 
                onChange={(event) => {
                  const name = event.target.value;
                  setStoreForm((current) => ({
                    ...current,
                    name,
                    slug: generateSlug(name)
                  }));
                }} 
              />
            </label>

            <div className="wide">
              <p className="form-group-label">Categorias de Produtos da Loja (Pode selecionar várias):</p>
              <div className="checkbox-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: "10px", marginTop: "8px" }}>
                {STORE_CATEGORIES.map((cat) => (
                  <label key={cat} className="checkbox-item" style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" }}>
                    <input 
                      type="checkbox"
                      checked={Array.isArray(storeForm.category) && storeForm.category.includes(cat)}
                      onChange={() => toggleStoreCategory(cat)}
                    />
                    <span>{cat}</span>
                  </label>
                ))}
              </div>
            </div>

            <label>
              Selecione o Bairro em Chimoio
              <select 
                required
                value={storeForm.neighborhood || ""}
                onChange={(event) => handleNeighborhoodChange(event.target.value)}
              >
                <option value="">-- Escolha o bairro --</option>
                {CHIMOIO_NEIGHBORHOODS.map((n) => (
                  <option key={n.name} value={n.name}>{n.name}</option>
                ))}
              </select>
            </label>

            <label>
              Endereço / Detalhes de localização
              <input 
                required 
                placeholder="Ex.: Próximo ao mercado central, Quarteirão 4"
                value={storeForm.address} 
                onChange={(event) => setStoreForm((current) => ({ ...current, address: event.target.value }))}
              />
            </label>

            <div className="wide geo-note">
              <p>📍 <b>Localização por GPS (Opcional):</b> Ativar o GPS ajuda os clientes de Chimoio a encontrarem a rota exata até à sua porta com maior precisão no mapa.</p>
              <button type="button" className="button button-outline" onClick={handleGetLocation}>
                {gpsEnabled ? "✅ GPS Ativado e Coordenadas Preenchidas" : "Ativar minha localização GPS atual"}
              </button>
            </div>

            <label className="wide">
              Descrição da loja
              <textarea 
                required 
                maxLength={4000} 
                placeholder="Conte o que a sua loja vende, horários de atendimento ou facilidades de entrega..."
                value={storeForm.description} 
                onChange={(event) => setStoreForm((current) => ({ ...current, description: event.target.value }))}
              />
            </label>

            <button className="button button-dark" type="submit" disabled={busy}>Registar e abrir loja</button>
          </form>
        </div>
      )}

      {profile.role === "lojista" && (
        <div className="panel">
          <div className="section-head">
            <div>
              <p className="eyebrow">GESTÃO DE PRODUTOS</p>
              <h2>Adicionar novo produto</h2>
              <p>Os preços são guardados com segurança em Meticais (MT).</p>
            </div>
          </div>
          <form className="form-grid" onSubmit={handleProductSubmit}>
            <label>
              Nome do produto
              <input 
                required 
                maxLength={160} 
                placeholder="Ex.: Telefone Samsung Galaxy A14, Ténis Nike Tam 42"
                value={productForm.name} 
                onChange={(event) => setProductForm((current) => ({ ...current, name: event.target.value }))} 
              />
            </label>

            <label>
              Preço (MT)
              <input 
                required 
                type="number" 
                min="0.01" 
                step="0.01" 
                placeholder="Ex.: 1500.00"
                value={productForm.price} 
                onChange={(event) => setProductForm((current) => ({ ...current, price: event.target.value }))} 
              />
            </label>

            <label className="wide">
              Categoria do produto (Definida pela sua loja)
              <select 
                required
                value={productForm.category}
                onChange={(event) => setProductForm((current) => ({ ...current, category: event.target.value }))}
              >
                <option value="">
                  {productCategories.length > 0
                    ? "-- Selecione a categoria da sua loja --"
                    : "A loja ainda não tem categorias registadas"}
                </option>
                {productCategories.map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </label>

            {/* Campo de Upload de 1 Foto para o Produto */}
            <label className="wide">
              Fotografia do Produto (1 Foto)
              <input 
                type="file" 
                accept="image/jpeg,image/png,image/webp"
                required
                onChange={(event) => {
                  if (event.target.files?.[0]) {
                    setProductImageFile(event.target.files[0]);
                  }
                }}
              />
              <small style={{ color: "#666", fontSize: "0.75rem" }}>Selecione uma imagem clara e nítida do artigo.</small>
            </label>

            <label className="wide">
              Detalhes do produto
              <textarea 
                required 
                maxLength={4000} 
                placeholder="Descreva o estado do artigo (novo/usado), cor, tamanho, garantias..."
                value={productForm.description} 
                onChange={(event) => setProductForm((current) => ({ ...current, description: event.target.value }))} 
              />
            </label>

            <button className="button button-dark" type="submit" disabled={busy || uploadingImage}>
              {uploadingImage ? "A carregar imagem..." : "Adicionar produto à loja"}
            </button>
          </form>
        </div>
      )}

      {profile.role === "client" && (
        <div className="panel">
          <div className="section-head">
            <div>
              <p className="eyebrow">OFERECER SERVIÇOS (PLANO 1: SERVIÇOS)</p>
              <h2>Cadastre-se como prestador de serviços</h2>
            </div>
          </div>
          <form className="form-grid" onSubmit={(event) => void onRegisterProvider(event, providerForm)}>
            <div className="wide">
              <p className="form-group-label">Áreas de Atuação / Especialidades (Pode selecionar várias):</p>
              <div className="checkbox-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: "10px", marginTop: "8px" }}>
                {SERVICE_CATEGORIES.map((cat) => (
                  <label key={cat} className="checkbox-item" style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" }}>
                    <input 
                      type="checkbox"
                      checked={Array.isArray(providerForm.category) && providerForm.category.includes(cat)}
                      onChange={() => toggleProviderCategory(cat)}
                    />
                    <span>{cat}</span>
                  </label>
                ))}
              </div>
            </div>

            <label className="wide">
              Preço inicial ou taxa de visita (MT)
              <input 
                required 
                type="number" 
                min="0" 
                step="0.01" 
                placeholder="Ex.: 500.00"
                value={providerForm.basePrice} 
                onChange={(event) => setProviderForm((current) => ({ ...current, basePrice: event.target.value }))}
              />
            </label>

            <label className="wide">
              Sobre si e sua experiência (Apresentação profissional)
              <textarea 
                required 
                maxLength={2000} 
                placeholder="Fale um pouco sobre o seu trabalho, anos de experiência e zonas de atendimento em Chimoio..."
                value={providerForm.bio} 
                onChange={(event) => setProviderForm((current) => ({ ...current, bio: event.target.value }))}
              />
            </label>

            <button className="button button-dark" type="submit" disabled={busy}>Criar perfil de prestador</button>
          </form>
        </div>
      )}

    </section>
  );
}