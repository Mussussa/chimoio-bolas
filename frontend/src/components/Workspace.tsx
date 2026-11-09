import { useState, type Dispatch, type FormEvent, type SetStateAction } from "react";
import type { ProductForm, Profile, ProviderForm, ServiceForm, StoreForm } from "../lib/types";
import { CHIMOIO_NEIGHBORHOODS } from "../lib/chimoioNeighborhoods";
import { supabase } from "../lib/supabase";

type WorkspaceProps = Readonly<{
  profile: Profile;
  ownProvider: boolean;
  busy: boolean;
  providerForm: ProviderForm & { category: string[] };
  serviceForm: ServiceForm;
  storeForm: StoreForm & { neighborhood?: string; category: string[] };
  productForm: ProductForm;
  setProviderForm: Dispatch<SetStateAction<any>>;
  setServiceForm: Dispatch<SetStateAction<ServiceForm>>;
  setStoreForm: Dispatch<SetStateAction<any>>;
  setProductForm: Dispatch<SetStateAction<ProductForm>>;
  registerStore: (event: FormEvent<HTMLFormElement>) => void;
  createProduct: (event: FormEvent<HTMLFormElement>) => void;
  registerProvider: (event: FormEvent<HTMLFormElement>) => void;
  publishService: (event: FormEvent<HTMLFormElement>) => void;
}>;

// Listas oficiais de categorias para os formulários de lojas e serviços
const STORE_CATEGORIES = [
  "Imóveis", "Eletrónicos", "Automóveis", "Agricultura",
  "Materiais de Construção", "Moda & Vestuário", "Alimentação & Bebidas",
  "Saúde & Beleza", "Casa & Decoração", "Diversos"
];

const SERVICE_CATEGORIES = [
  "Construção", "Eletricidade", "Hidráulica", "Carpintaria & Serralharia",
  "Transporte & Logística", "Hotelaria & Restauração", "Tecnologia & Informática",
  "Beleza & Estética", "Limpeza & Jardinagem", "Diversos"
];

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
  profile,
  ownProvider,
  busy,
  providerForm,
  serviceForm,
  storeForm,
  productForm,
  setProviderForm,
  setServiceForm,
  setStoreForm,
  setProductForm,
  registerStore,
  createProduct,
  registerProvider,
  publishService
}: WorkspaceProps) {
  const [gpsEnabled, setGpsEnabled] = useState(false);
  
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
    setStoreForm((prev: any) => ({ ...prev, category: updated }));
  };

  const toggleProviderCategory = (cat: string) => {
    const current = Array.isArray(providerForm.category) ? providerForm.category : [];
    const updated = current.includes(cat)
      ? current.filter((c: string) => c !== cat)
      : [...current, cat];
    setProviderForm((prev: any) => ({ ...prev, category: updated }));
  };

  const handleNeighborhoodChange = (neighborhoodName: string) => {
    const found = CHIMOIO_NEIGHBORHOODS.find((n) => n.name === neighborhoodName);
    setStoreForm((current: any) => ({
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
        setStoreForm((current: any) => ({
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
      alert("O cliente Supabase não está inicializado.");
      return;
    }

    setUploadingImage(true);
    try {
      // 1. Faz o upload direto para o Supabase Storage (Bucket 'products')
      const fileExt = productImageFile.name.split(".").pop();
      const fileName = `${Math.random().toString(36).substring(2)}_${Date.now()}.${fileExt}`;
      const filePath = `product-images/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("products")
        .upload(filePath, productImageFile);

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

      setProductForm(finalPayload);

      // 4. Submete para o backend
      createProduct(event);
      
      setProductImageFile(null);
    } catch (error) {
      console.error("Erro ao carregar fotografia do produto:", (error as Error).message);
      alert("Erro ao carregar a imagem para o servidor. Verifique as permissões do storage.");
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
          <form className="form-grid" onSubmit={registerStore}>
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
                  setStoreForm((current: any) => ({ 
                    ...current, 
                    name, 
                    slug: generateSlug(name) 
                  }));
                }} 
              />
            </label>

            <div className="wide">
              <label>Categorias de Produtos da Loja (Pode selecionar várias):</label>
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
                onChange={(event) => setStoreForm((current: any) => ({ ...current, address: event.target.value }))} 
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
                onChange={(event) => setStoreForm((current: any) => ({ ...current, description: event.target.value }))} 
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
                accept="image/*"
                required
                onChange={(event) => {
                  if (event.target.files && event.target.files[0]) {
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
          <form className="form-grid" onSubmit={registerProvider}>
            <div className="wide">
              <label>Áreas de Atuação / Especialidades (Pode selecionar várias):</label>
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
                onChange={(event) => setProviderForm((current: any) => ({ ...current, basePrice: event.target.value }))} 
              />
            </label>

            <label className="wide">
              Sobre si e sua experiência (Apresentação profissional)
              <textarea 
                required 
                maxLength={2000} 
                placeholder="Fale um pouco sobre o seu trabalho, anos de experiência e zonas de atendimento em Chimoio..."
                value={providerForm.bio} 
                onChange={(event) => setProviderForm((current: any) => ({ ...current, bio: event.target.value }))} 
              />
            </label>

            <button className="button button-dark" type="submit" disabled={busy}>Criar perfil de prestador</button>
          </form>
        </div>
      )}

      {ownProvider && (
        <div className="panel">
          <div className="section-head">
            <div>
              <p className="eyebrow">PAINEL DO PRESTADOR</p>
              <h2>Publicar novo serviço</h2>
              <p>O seu serviço ficará visível para os clientes de Chimoio assim que for publicado.</p>
            </div>
          </div>
          <form className="form-grid" onSubmit={publishService}>
            <label>
              Título do serviço
              <input 
                required 
                maxLength={180} 
                placeholder="Ex.: Instalação elétrica residencial completa"
                value={serviceForm.title} 
                onChange={(event) => setServiceForm((current) => ({ ...current, title: event.target.value }))} 
              />
            </label>

            <label>
              Valor cobrado (MT)
              <input 
                required 
                type="number" 
                min="0" 
                step="0.01" 
                placeholder="Ex.: 2500.00"
                value={serviceForm.price} 
                onChange={(event) => setServiceForm((current) => ({ ...current, price: event.target.value }))} 
              />
            </label>

            <label>
              Tempo médio de execução
              <input 
                required 
                maxLength={100} 
                value={serviceForm.deliveryTime} 
                onChange={(event) => setServiceForm((current) => ({ ...current, deliveryTime: event.target.value }))} 
                placeholder="Ex.: 1 dia, 3 horas, No mesmo dia" 
              />
            </label>

            <label className="wide">
              Descrição detalhada do serviço
              <textarea 
                required 
                maxLength={5000} 
                placeholder="Explique exatamente o que está incluído no valor, materiais necessários..."
                value={serviceForm.description} 
                onChange={(event) => setServiceForm((current) => ({ ...current, description: event.target.value }))} 
              />
            </label>

            <button className="button button-dark" type="submit" disabled={busy}>Publicar serviço no mercado</button>
          </form>
        </div>
      )}
    </section>
  );
}