import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import type { Session } from "@supabase/supabase-js";
import { api } from "./lib/api";
import { supabase } from "./lib/supabase";
import MapExplorer from "./components/MapExplorer";

type Profile = { id: string; name: string; email: string; phone: string | null; role: "client" | "lojista" | "prestador" | "admin" };
type Store = { id: string; owner_id: string; name: string; category: string; description: string; address: string; latitude: number; longitude: number; verified: boolean };
type Product = { id: string; store_id: string; name: string; description: string; price: string; category: string; images: string[] };
type ServiceProvider = { id: string; user_id: string; category: string; bio: string; base_price: string; verified: boolean; platform_member: boolean };
type Service = { id: string; provider_id: string; title: string; description: string; price: string; delivery_time: string; published: boolean; internal_platform_service: boolean };
type Negotiation = {
  id: string; client_id: string; status: string; agreed_price: string | null;
  messages: Array<{ id: string; sender_id: string; content: string; message_type: string; proposal_amount: string | null }>;
};
type Catalog = { stores: Store[]; products: Product[]; providers: ServiceProvider[]; services: Service[] };
type Notice = { text: string; error?: boolean } | null;
const emptyCatalog: Catalog = { stores: [], products: [], providers: [], services: [] };

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [catalog, setCatalog] = useState<Catalog>(emptyCatalog);
  const [negotiations, setNegotiations] = useState<Negotiation[]>([]);
  const [notice, setNotice] = useState<Notice>(null);
  const [busy, setBusy] = useState(false);
  const [search, setSearch] = useState("");
  const [nearby, setNearby] = useState(false);
  const [coordinates, setCoordinates] = useState<[number, number] | null>(null);
  const [authForm, setAuthForm] = useState({ email: "", password: "" });
  const [authMode, setAuthMode] = useState<"login" | "signup">("login");
  const [providerForm, setProviderForm] = useState({ category: "", bio: "", basePrice: "" });
  const [serviceForm, setServiceForm] = useState({ title: "", description: "", price: "", deliveryTime: "" });
  const [storeForm, setStoreForm] = useState({ name: "", slug: "", category: "", description: "", address: "", latitude: "-19.1164", longitude: "33.4833" });
  const [productForm, setProductForm] = useState({ name: "", description: "", price: "", category: "" });
  const [priceDrafts, setPriceDrafts] = useState<Record<string, string>>({});
  const [selectedNegotiation, setSelectedNegotiation] = useState("");
  const [messageForm, setMessageForm] = useState({ content: "", proposalAmount: "" });

  const loadCatalog = useCallback(async () => {
    if (!supabase) {
      setNotice({ text: "Configure VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY no frontend/.env.local.", error: true });
      return;
    }
    const [stores, products, providers, services] = await Promise.all([
      supabase.from("stores").select("*").order("created_at", { ascending: false }),
      supabase.from("products").select("*").order("created_at", { ascending: false }),
      supabase.from("service_providers").select("*").order("created_at", { ascending: false }),
      supabase.from("services").select("*").eq("published", true).order("created_at", { ascending: false })
    ]);
    const failed = [stores, products, providers, services].find((result) => result.error);
    if (failed?.error) throw failed.error;
    setCatalog({
      stores: (stores.data ?? []) as Store[],
      products: (products.data ?? []) as Product[],
      providers: (providers.data ?? []) as ServiceProvider[],
      services: (services.data ?? []) as Service[]
    });
  }, []);

  const loadNegotiations = useCallback(async (currentSession: Session) => {
    const result = await api<{ negotiations: Negotiation[] }>("/negotiations", currentSession);
    setNegotiations(result.negotiations);
  }, []);

  useEffect(() => {
    void loadCatalog().catch((error: Error) => setNotice({ text: error.message, error: true }));
    if (!supabase) return;
    void supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, currentSession) => {
      setSession(currentSession);
      setProfile(null);
      setNegotiations([]);
    });
    return () => subscription.unsubscribe();
  }, [loadCatalog]);

  useEffect(() => {
    if (!session) return;
    let active = true;
    Promise.all([
      api<Profile>("/profile/me", session),
      loadNegotiations(session)
    ]).then(([nextProfile]) => { if (active) setProfile(nextProfile); })
      .catch((error: Error) => { if (active) setNotice({ text: error.message, error: true }); });
    return () => { active = false; };
  }, [session, loadNegotiations]);

  const providerIds = useMemo(() => new Set(catalog.providers.map((provider) => provider.id)), [catalog.providers]);
  const visibleProducts = useMemo(() => {
    const term = search.trim().toLocaleLowerCase();
    return catalog.products.filter((product) => !term || `${product.name} ${product.description} ${product.category}`.toLocaleLowerCase().includes(term));
  }, [catalog.products, search]);
  const visibleServices = useMemo(() => catalog.services.filter((service) => {
    const provider = catalog.providers.find((item) => item.id === service.provider_id);
    const term = search.trim().toLocaleLowerCase();
    return providerIds.has(service.provider_id) && (!term || `${service.title} ${service.description} ${provider?.category ?? ""}`.toLocaleLowerCase().includes(term));
  }), [catalog.providers, catalog.services, providerIds, search]);

  async function submitAuth(event: FormEvent) {
    event.preventDefault();
    if (!supabase) return setNotice({ text: "Supabase local não está configurado.", error: true });
    setBusy(true);
    setNotice(null);
    try {
      const result = authMode === "login"
        ? await supabase.auth.signInWithPassword(authForm)
        : await supabase.auth.signUp(authForm);
      if (result.error) throw result.error;
      if (!result.data.session) setNotice({ text: "Conta criada. Confirme o e-mail para iniciar sessão." });
    } catch (error) {
      setNotice({ text: (error as Error).message, error: true });
    } finally {
      setBusy(false);
    }
  }

  async function signOut() {
    const result = await supabase?.auth.signOut();
    if (result?.error) setNotice({ text: result.error.message, error: true });
  }

  async function runApi<T>(path: string, body: unknown, method = "POST"): Promise<T | null> {
    if (!session) {
      setNotice({ text: "Inicia sessão para continuar.", error: true });
      return null;
    }
    setBusy(true);
    setNotice(null);
    try {
      const result = await api<T>(path, session, { method, body });
      setNotice({ text: "Operação concluída." });
      return result;
    } catch (error) {
      setNotice({ text: (error as Error).message, error: true });
      return null;
    } finally {
      setBusy(false);
    }
  }

  async function registerProvider(event: FormEvent) {
    event.preventDefault();
    const result = await runApi<{ provider: ServiceProvider }>("/providers/register", providerForm);
    if (result) {
      setProfile((current) => current ? { ...current, role: "prestador" } : current);
      await loadCatalog();
    }
  }

  async function publishService(event: FormEvent) {
    event.preventDefault();
    const result = await runApi<{ service: Service }>("/services", serviceForm);
    if (result) {
      setServiceForm({ title: "", description: "", price: "", deliveryTime: "" });
      await loadCatalog();
    }
  }

  async function registerStore(event: FormEvent) {
    event.preventDefault();
    const result = await runApi<{ store: Store }>("/stores/register", storeForm);
    if (result) {
      setProfile((current) => current ? { ...current, role: "lojista" } : current);
      setNotice({ text: "Loja criada. Um administrador deve verificá-la antes da listagem pública." });
    }
  }

  async function createProduct(event: FormEvent) {
    event.preventDefault();
    const result = await runApi("/products", productForm);
    if (result) {
      setProductForm({ name: "", description: "", price: "", category: "" });
      await loadCatalog();
    }
  }

  async function updateProductPrice(productId: string) {
    const price = Number(priceDrafts[productId]);
    const result = await runApi(`/products/${productId}/price`, { price }, "PATCH");
    if (result) await loadCatalog();
  }

  async function startNegotiation(serviceId: string) {
    const result = await runApi<{ negotiation: Negotiation }>("/negotiations", { serviceId });
    if (result && session) {
      await loadNegotiations(session);
      setSelectedNegotiation(result.negotiation.id);
    }
  }

  async function sendMessage(event: FormEvent) {
    event.preventDefault();
    if (!selectedNegotiation) return;
    const isProposal = messageForm.proposalAmount.trim() !== "";
    const result = await runApi(`/negotiations/${selectedNegotiation}/messages`, {
      content: messageForm.content,
      messageType: isProposal ? "proposal" : "text",
      ...(isProposal ? { proposalAmount: Number(messageForm.proposalAmount) } : {})
    });
    if (result && session) {
      setMessageForm({ content: "", proposalAmount: "" });
      await loadNegotiations(session);
    }
  }

  function updateMessageField(negotiationId: string, field: "content" | "proposalAmount", value: string) {
    if (selectedNegotiation !== negotiationId) {
      setSelectedNegotiation(negotiationId);
      setMessageForm({ content: field === "content" ? value : "", proposalAmount: field === "proposalAmount" ? value : "" });
      return;
    }
    setMessageForm((current) => ({ ...current, [field]: value }));
  }

  async function respondToProposal(negotiationId: string, messageId: string, action: "accept" | "reject") {
    const result = await runApi(`/negotiations/${negotiationId}/proposals/${messageId}/respond`, { action });
    if (result && session) await loadNegotiations(session);
  }

  function locate() {
    if (!navigator.geolocation) return setNotice({ text: "GPS não está disponível neste dispositivo.", error: true });
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => { setCoordinates([coords.latitude, coords.longitude]); setNearby(true); },
      () => setNotice({ text: "Não foi possível obter a localização. Verifica a permissão de GPS.", error: true })
    );
  }

  async function completeNegotiation(negotiationId: string) {
    const result = await runApi(`/negotiations/${negotiationId}/complete`, {});
    if (result && session) await loadNegotiations(session);
  }

  const ownProvider = catalog.providers.find((provider) => provider.user_id === profile?.id);

  return (
    <main className="app-shell">
      <header className="topbar">
        <a className="brand" href="#inicio"><span className="brand-icon">CB</span><span>Chimoio <b>Boladas</b><small>NEGÓCIOS LOCAIS</small></span></a>
        <nav><a href="#mercado">Explorar</a><a href="#servicos">Serviços</a><a href="#negociacoes">Negociações</a></nav>
        <div className="account">{profile ? <><span>{profile.name} · {profile.role}</span><button className="button button-outline" onClick={signOut}>Sair</button></> : <a className="button button-dark" href="#conta">Entrar</a>}</div>
      </header>

      {notice && <div className={`notice ${notice.error ? "notice-error" : ""}`} role="status">{notice.text}<button onClick={() => setNotice(null)}>×</button></div>}

      <section className="hero" id="inicio">
        <div><p className="eyebrow">MERCADO HIPERLOCAL · CHIMOIO</p><h1>Encontre perto.<br /><em>Negocie directo.</em></h1><p className="hero-copy">Marketplace gratuito e aberto para descobrir negócios locais, publicar serviços e negociar directamente.</p><a className="button button-light" href="#mercado">Explorar ofertas <span>↗</span></a></div>
        <div className="hero-stamp"><span>19°07′ S</span><b>CHIMOIO</b><span>33°29′ E</span></div>
      </section>

      <section className="market section" id="mercado">
        <div className="section-head"><div><p className="eyebrow">CATÁLOGO PÚBLICO</p><h2>Descubra a cidade</h2><p>As listas e coordenadas são lidas directamente do Supabase com políticas RLS.</p></div>
          <div className="search-box"><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Produto, serviço ou categoria..." /><button className="button button-outline" onClick={locate}>Usar GPS</button></div>
        </div>
        {nearby && coordinates && <p className="geo-note">Distâncias calculadas no navegador a partir da sua localização. <button onClick={() => setNearby(false)}>Limpar</button></p>}
        <MapExplorer stores={catalog.stores} gps={coordinates} />
        <div className="catalog-grid">
          {visibleProducts.map((product) => <article className="listing-card" key={product.id}><span className="tag">PRODUTO · {product.category}</span><h3>{product.name}</h3><p>{product.description}</p><div className="listing-foot"><b>{Number(product.price).toLocaleString("pt-MZ")} MT</b><span>{catalog.stores.find((store) => store.id === product.store_id)?.name ?? "Loja local"}</span></div>{catalog.stores.find((store) => store.id === product.store_id)?.owner_id === profile?.id && <div className="price-editor"><input type="number" min="0.01" step="0.01" value={priceDrafts[product.id] ?? product.price} onChange={(event) => setPriceDrafts({ ...priceDrafts, [product.id]: event.target.value })} aria-label={`Novo preço de ${product.name}`} /><button className="button button-outline" onClick={() => void updateProductPrice(product.id)}>Alterar preço</button></div>}</article>)}
          {visibleServices.map((service) => {
            const provider = catalog.providers.find((item) => item.id === service.provider_id);
            return <article className="listing-card service-card" key={service.id}><span className="tag tag-green">SERVIÇO · NA PLATAFORMA</span><h3>{service.title}</h3><p>{service.description}</p><div className="listing-foot"><b>{Number(service.price).toLocaleString("pt-MZ")} MT</b><span>{provider?.category} · {service.delivery_time}</span></div>{profile?.role === "client" && <button className="button button-dark full-button" disabled={busy} onClick={() => void startNegotiation(service.id)}>Iniciar negociação</button>}</article>;
          })}
          {catalog.stores.filter((store) => !search || `${store.name} ${store.category}`.toLowerCase().includes(search.toLowerCase())).map((store) => <article className="listing-card store-card" key={store.id}><span className="tag">LOJA VERIFICADA · {store.category}</span><h3>{store.name}</h3><p>{store.description}</p><div className="listing-foot"><span>{store.address}</span>{coordinates && <b>{distance(coordinates[0], coordinates[1], Number(store.latitude), Number(store.longitude)).toFixed(1)} km</b>}</div></article>)}
          {!visibleProducts.length && !visibleServices.length && !catalog.stores.length && <p className="empty">Ainda não há ofertas públicas. Liga o Supabase local e executa as migrations para iniciar.</p>}
        </div>
      </section>

      {profile && <section className="section workspace">
        {profile.role === "client" && <div className="panel">
          <div className="section-head"><div><p className="eyebrow">ABRIR NEGÓCIO</p><h2>Registar loja local</h2></div></div>
          <form className="form-grid" onSubmit={(event) => void registerStore(event)}>
            <label>Nome<input required maxLength={160} value={storeForm.name} onChange={(event) => setStoreForm({ ...storeForm, name: event.target.value })} /></label>
            <label>Slug (URL)<input required pattern="[a-z0-9]+(-[a-z0-9]+)*" value={storeForm.slug} onChange={(event) => setStoreForm({ ...storeForm, slug: event.target.value })} placeholder="minha-loja" /></label>
            <label>Categoria<input required value={storeForm.category} onChange={(event) => setStoreForm({ ...storeForm, category: event.target.value })} /></label>
            <label>Endereço<input required value={storeForm.address} onChange={(event) => setStoreForm({ ...storeForm, address: event.target.value })} /></label>
            <label>Latitude<input required type="number" min="-90" max="90" step="any" value={storeForm.latitude} onChange={(event) => setStoreForm({ ...storeForm, latitude: event.target.value })} /></label>
            <label>Longitude<input required type="number" min="-180" max="180" step="any" value={storeForm.longitude} onChange={(event) => setStoreForm({ ...storeForm, longitude: event.target.value })} /></label>
            <label className="wide">Descrição<textarea required maxLength={4000} value={storeForm.description} onChange={(event) => setStoreForm({ ...storeForm, description: event.target.value })} /></label>
            <button className="button button-dark" disabled={busy}>Registar e aguardar verificação</button>
          </form>
        </div>}
        {profile.role === "lojista" && <div className="panel">
          <div className="section-head"><div><p className="eyebrow">GESTÃO DE PRODUTOS</p><h2>Adicionar produto</h2><p>Os preços são validados e guardados pelo Express.</p></div></div>
          <form className="form-grid" onSubmit={(event) => void createProduct(event)}>
            <label>Nome<input required maxLength={160} value={productForm.name} onChange={(event) => setProductForm({ ...productForm, name: event.target.value })} /></label>
            <label>Preço (MT)<input required type="number" min="0.01" step="0.01" value={productForm.price} onChange={(event) => setProductForm({ ...productForm, price: event.target.value })} /></label>
            <label>Categoria<input required value={productForm.category} onChange={(event) => setProductForm({ ...productForm, category: event.target.value })} /></label>
            <label className="wide">Descrição<textarea required maxLength={4000} value={productForm.description} onChange={(event) => setProductForm({ ...productForm, description: event.target.value })} /></label>
            <button className="button button-dark" disabled={busy}>Adicionar produto</button>
          </form>
        </div>}
        {profile.role === "client" && <div className="panel">
          <div className="section-head"><div><p className="eyebrow">TORNE-SE PRESTADOR</p><h2>Publique o seu serviço</h2></div></div>
          <form className="form-grid" onSubmit={(event) => void registerProvider(event)}>
            <label>Categoria<input required value={providerForm.category} onChange={(event) => setProviderForm({ ...providerForm, category: event.target.value })} /></label>
            <label>Preço base (MT)<input required type="number" min="0" step="0.01" value={providerForm.basePrice} onChange={(event) => setProviderForm({ ...providerForm, basePrice: event.target.value })} /></label>
            <label className="wide">Biografia<textarea required maxLength={2000} value={providerForm.bio} onChange={(event) => setProviderForm({ ...providerForm, bio: event.target.value })} /></label>
            <button className="button button-dark" disabled={busy}>Criar perfil gratuito de prestador</button>
          </form>
        </div>}
        {ownProvider && <div className="panel">
          <div className="section-head"><div><p className="eyebrow">MEMBRO DA PLATAFORMA</p><h2>Publicar serviço directamente</h2><p>O serviço fica marcado como interno e publicado após validação no servidor.</p></div></div>
          <form className="form-grid" onSubmit={(event) => void publishService(event)}>
            <label>Título<input required maxLength={180} value={serviceForm.title} onChange={(event) => setServiceForm({ ...serviceForm, title: event.target.value })} /></label>
            <label>Preço (MT)<input required type="number" min="0" step="0.01" value={serviceForm.price} onChange={(event) => setServiceForm({ ...serviceForm, price: event.target.value })} /></label>
            <label>Prazo de entrega<input required maxLength={100} value={serviceForm.deliveryTime} onChange={(event) => setServiceForm({ ...serviceForm, deliveryTime: event.target.value })} placeholder="Ex.: 2 dias" /></label>
            <label className="wide">Descrição<textarea required maxLength={5000} value={serviceForm.description} onChange={(event) => setServiceForm({ ...serviceForm, description: event.target.value })} /></label>
            <button className="button button-dark" disabled={busy}>Publicar serviço</button>
          </form>
        </div>}
      </section>}

      <section className="section negotiations" id="negociacoes">
        <div className="section-head"><div><p className="eyebrow">MENSAGENS E PROPOSTAS</p><h2>Negociações</h2><p>Conversa e propostas passam pelo Express; não há pagamentos ou escrow na plataforma.</p></div></div>
        {!session && <p className="empty">Inicia sessão para abrir negociações.</p>}
        {negotiations.map((negotiation) => <article className="negotiation-card" key={negotiation.id}>
          <div className="negotiation-head"><div><b>Negociação {negotiation.id.slice(0, 8)}</b><span>{negotiation.status} · {negotiation.agreed_price ? `${Number(negotiation.agreed_price).toLocaleString("pt-MZ")} MT` : "sem preço acordado"}</span></div>
            {negotiation.status === "accepted" && profile?.id === negotiation.client_id && <button className="button button-dark" onClick={() => void completeNegotiation(negotiation.id)}>Confirmar conclusão</button>}
          </div>
          <div className="messages">{negotiation.messages?.map((message) => <div className={message.sender_id === profile?.id ? "message mine" : "message"} key={message.id}><b>{message.message_type === "proposal" ? `Proposta · ${Number(message.proposal_amount).toLocaleString("pt-MZ")} MT` : "Mensagem"}</b><p>{message.content}</p>
            {message.message_type === "proposal" && message.sender_id !== profile?.id && negotiation.status === "pending" && <span><button onClick={() => void respondToProposal(negotiation.id, message.id, "accept")}>Aceitar</button><button onClick={() => void respondToProposal(negotiation.id, message.id, "reject")}>Recusar</button></span>}
          </div>)}</div>
          {negotiation.status !== "completed" && negotiation.status !== "rejected" && <form className="message-form" onSubmit={(event) => void sendMessage(event)}>
            <input required value={selectedNegotiation === negotiation.id ? messageForm.content : ""} onFocus={() => { if (selectedNegotiation !== negotiation.id) updateMessageField(negotiation.id, "content", ""); }} onChange={(event) => updateMessageField(negotiation.id, "content", event.target.value)} placeholder="Escreve uma mensagem ou proposta..." />
            <input type="number" min="0.01" step="0.01" value={selectedNegotiation === negotiation.id ? messageForm.proposalAmount : ""} onFocus={() => { if (selectedNegotiation !== negotiation.id) updateMessageField(negotiation.id, "proposalAmount", ""); }} onChange={(event) => updateMessageField(negotiation.id, "proposalAmount", event.target.value)} placeholder="Proposta MT (opcional)" />
            <button className="button button-dark" disabled={busy}>Enviar</button>
          </form>}
        </article>)}
      </section>

      {!session && <section className="section auth-section" id="conta"><div className="auth-card">
        <p className="eyebrow">CONTA DO MARKETPLACE</p><h2>{authMode === "login" ? "Bem-vindo de volta." : "Criar conta local."}</h2>
        <form onSubmit={(event) => void submitAuth(event)}><label>E-mail<input required type="email" autoComplete="email" value={authForm.email} onChange={(event) => setAuthForm({ ...authForm, email: event.target.value })} /></label><label>Palavra-passe<input required type="password" minLength={8} autoComplete={authMode === "login" ? "current-password" : "new-password"} value={authForm.password} onChange={(event) => setAuthForm({ ...authForm, password: event.target.value })} /></label><button className="button button-dark full-button" disabled={busy}>{authMode === "login" ? "Entrar" : "Registar"}</button></form>
        <button className="link-button" onClick={() => setAuthMode(authMode === "login" ? "signup" : "login")}>{authMode === "login" ? "Ainda não tens conta? Regista-te" : "Já tens conta? Entrar"}</button>
      </div></section>}

      <footer><span>CHIMOIO BOLADAS</span><span>Marketplace local gratuito · preços de produtos e serviços em MT</span></footer>
    </main>
  );
}

function distance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const radians = (value: number) => value * Math.PI / 180;
  const deltaLat = radians(lat2 - lat1);
  const deltaLon = radians(lon2 - lon1);
  const a = Math.sin(deltaLat / 2) ** 2 + Math.cos(radians(lat1)) * Math.cos(radians(lat2)) * Math.sin(deltaLon / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
