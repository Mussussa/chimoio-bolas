import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import type { Session } from "@supabase/supabase-js";
import Account from "./components/Account";
import Marketplace from "./components/Marketplace";
import Negotiations from "./components/Negotiations";
import { Hero, NoticeBanner, SiteFooter, SiteHeader } from "./components/SiteChrome";
import Workspace from "./components/Workspace";
import {
  completeNegotiation as completeNegotiationRequest,
  createProduct as createProductRequest,
  loadCatalog as fetchCatalog,
  loadNegotiations as fetchNegotiations,
  loadProfile,
  publishService as publishServiceRequest,
  registerProvider as registerProviderRequest,
  registerStore as registerStoreRequest,
  respondToProposal as respondToProposalRequest,
  sendNegotiationMessage,
  startNegotiation as startNegotiationRequest,
  updateProductPrice as updateProductPriceRequest
} from "./lib/api";
import { supabase } from "./lib/supabase";
import type {
  AuthForm,
  Catalog,
  MessageForm,
  Negotiation,
  Notice,
  ProductForm,
  Profile,
  ProviderForm,
  ServiceForm,
  StoreForm
} from "./lib/types";

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
  const [authForm, setAuthForm] = useState<AuthForm>({ email: "", password: "" });
  const [authMode, setAuthMode] = useState<"login" | "signup">("login");
  const [providerForm, setProviderForm] = useState<ProviderForm>({ category: [], bio: "", basePrice: "" });
  const [serviceForm, setServiceForm] = useState<ServiceForm>({ title: "", description: "", price: "", deliveryTime: "" });
  const [storeForm, setStoreForm] = useState<StoreForm>({ name: "", slug: "", category: [], description: "", address: "", latitude: "-19.1164", longitude: "33.4833" });
  const [productForm, setProductForm] = useState<ProductForm>({ name: "", description: "", price: "", category: "" });
  const [priceDrafts, setPriceDrafts] = useState<Record<string, string>>({});
  const [selectedNegotiation, setSelectedNegotiation] = useState("");
  const [messageForm, setMessageForm] = useState<MessageForm>({ content: "", proposalAmount: "" });

  const loadCatalog = useCallback(async () => {
    try {
      setCatalog(await fetchCatalog());
    } catch (error) {
      setNotice({ text: (error as Error).message, error: true });
    }
  }, []);

  const loadUserNegotiations = useCallback(async (currentSession: Session) => {
    setNegotiations(await fetchNegotiations(currentSession));
  }, []);

  useEffect(() => {
    void loadCatalog();
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
    Promise.all([loadProfile(session), loadUserNegotiations(session)])
      .then(([nextProfile]) => { if (active) setProfile(nextProfile); })
      .catch((error: Error) => { if (active) setNotice({ text: error.message, error: true }); });
    return () => { active = false; };
  }, [session, loadUserNegotiations]);

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

async function submitAuth(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase) return setNotice({ text: "Supabase local não está configurado.", error: true });
    setBusy(true);
    setNotice(null);
    try {
      if (authMode === "login") {
        const result = await supabase.auth.signInWithPassword({
          email: authForm.email,
          password: authForm.password
        });
        if (result.error) throw result.error;
      } else {
        const result = await supabase.auth.signUp({
          email: authForm.email,
          password: authForm.password,
          options: { data: { phone: `+258${authForm.phone}` } }
        });

        if (result.error) throw result.error;

        if (!result.data.session) {
          setNotice({ text: "Conta criada com sucesso. Confirme o e-mail para iniciar sessão." });
        }
      }
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

  async function runApi<T>(request: (currentSession: Session) => Promise<T>): Promise<T | null> {
    if (!session) {
      setNotice({ text: "Inicia sessão para continuar.", error: true });
      return null;
    }
    setBusy(true);
    setNotice(null);
    try {
      const result = await request(session);
      setNotice({ text: "Operação concluída." });
      return result;
    } catch (error) {
      setNotice({ text: (error as Error).message, error: true });
      return null;
    } finally {
      setBusy(false);
    }
  }

  async function registerProvider(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const result = await runApi((currentSession) => registerProviderRequest(currentSession, providerForm));
    if (result) {
      setProfile((current) => current ? { ...current, role: "prestador" } : current);
      await loadCatalog();
    }
  }

  async function publishService(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const result = await runApi((currentSession) => publishServiceRequest(currentSession, serviceForm));
    if (result) {
      setServiceForm({ title: "", description: "", price: "", deliveryTime: "" });
      await loadCatalog();
    }
  }

  async function registerStore(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const result = await runApi((currentSession) => registerStoreRequest(currentSession, storeForm));
    if (result) {
      setProfile((current) => current
        ? { ...current, role: "lojista", store: { category: storeForm.category } }
        : current);
      setNotice({ text: "Loja criada. Um administrador deve verificá-la antes da listagem pública." });
    }
  }

  async function createProduct(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const result = await runApi((currentSession) => createProductRequest(currentSession, productForm));
    if (result) {
      setProductForm({ name: "", description: "", price: "", category: "" });
      await loadCatalog();
    }
  }

  async function updateProductPrice(productId: string) {
    const price = Number(priceDrafts[productId]);
    const result = await runApi((currentSession) => updateProductPriceRequest(currentSession, productId, price));
    if (result) await loadCatalog();
  }

  async function startNegotiation(serviceId: string) {
    const result = await runApi((currentSession) => startNegotiationRequest(currentSession, serviceId));
    if (result && session) {
      await loadUserNegotiations(session);
      setSelectedNegotiation(result.negotiation.id);
    }
  }

  async function sendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedNegotiation) return;
    const isProposal = messageForm.proposalAmount.trim() !== "";
    const result = await runApi((currentSession) => sendNegotiationMessage(currentSession, selectedNegotiation, {
      content: messageForm.content,
      messageType: isProposal ? "proposal" : "text",
      ...(isProposal ? { proposalAmount: Number(messageForm.proposalAmount) } : {})
    }));
    if (result && session) {
      setMessageForm({ content: "", proposalAmount: "" });
      await loadUserNegotiations(session);
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
    const result = await runApi((currentSession) => respondToProposalRequest(currentSession, negotiationId, messageId, action));
    if (result && session) await loadUserNegotiations(session);
  }

  function locate() {
    if (!navigator.geolocation) return setNotice({ text: "GPS não está disponível neste dispositivo.", error: true });
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => { setCoordinates([coords.latitude, coords.longitude]); setNearby(true); },
      () => setNotice({ text: "Não foi possível obter a localização. Verifica a permissão de GPS.", error: true })
    );
  }

  async function completeNegotiation(negotiationId: string) {
    const result = await runApi((currentSession) => completeNegotiationRequest(currentSession, negotiationId));
    if (result && session) await loadUserNegotiations(session);
  }

  const ownProvider = catalog.providers.some((provider) => provider.user_id === profile?.id);

  return (
    <main className="app-shell">
      <NoticeBanner notice={notice} onDismiss={() => setNotice(null)} />
      <SiteHeader profile={profile} onSignOut={() => void signOut()} />
      <Hero />
      <Marketplace
        stores={catalog.stores}
        products={visibleProducts}
        services={visibleServices}
        providers={catalog.providers}
        profile={profile}
        busy={busy}
        search={search}
        nearby={nearby}
        coordinates={coordinates}
        priceDrafts={priceDrafts}
        onSearchChange={setSearch}
        onLocate={locate}
        onClearLocation={() => setNearby(false)}
        onPriceChange={(productId, value) => setPriceDrafts((current) => ({ ...current, [productId]: value }))}
        onUpdatePrice={(productId) => void updateProductPrice(productId)}
        onStartNegotiation={(serviceId) => void startNegotiation(serviceId)}
      />
      {profile && <Workspace
        profile={profile}
        ownProvider={Boolean(ownProvider)}
        busy={busy}
        providerForm={providerForm}
        serviceForm={serviceForm}
        storeForm={storeForm}
        productForm={productForm}
        setProviderForm={setProviderForm}
        setServiceForm={setServiceForm}
        setStoreForm={setStoreForm}
        setProductForm={setProductForm}
        registerStore={registerStore}
        createProduct={createProduct}
        registerProvider={registerProvider}
        publishService={publishService}
      />}
      <Negotiations
        negotiations={negotiations}
        sessionExists={Boolean(session)}
        profile={profile}
        busy={busy}
        selectedNegotiation={selectedNegotiation}
        messageForm={messageForm}
        onSelectField={updateMessageField}
        onSendMessage={sendMessage}
        onRespondToProposal={(negotiationId, messageId, action) => void respondToProposal(negotiationId, messageId, action)}
        onComplete={(negotiationId) => void completeNegotiation(negotiationId)}
      />
      {!session && <Account
        authMode={authMode}
        authForm={authForm}
        busy={busy}
        setAuthForm={setAuthForm}
        onSubmit={submitAuth}
        onToggleMode={() => setAuthMode((current) => current === "login" ? "signup" : "login")}
      />}
      <SiteFooter />
    </main>
  );
}
