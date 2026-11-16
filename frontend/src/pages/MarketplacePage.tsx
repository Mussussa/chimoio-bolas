import { useCallback, useEffect, useState, type FormEvent } from "react";
import type { Session } from "@supabase/supabase-js";
import { Navigate, Route, Routes, useNavigate } from "react-router-dom";
import AdminDashboard from "./AdminDashboard";
import Account from "../components/auth/Account";
import ProfileSettingsForm from "../components/auth/ProfileSettingsForm";
import { Hero, NoticeBanner, SiteFooter, SiteHeader } from "../components/layout/SiteChrome";
import Marketplace from "../components/marketplace/Marketplace";
import Negotiations from "../components/negotiations/Negotiations";
import Workspace from "../components/workspace/Workspace";
import MerchantDashboard from "./MerchantDashboard";
import ProviderDashboard from "./ProviderDashboard";
import {
  checkApiHealth,
  createProduct as createProductRequest,
  createReview as createReviewRequest,
  registerProvider as registerProviderRequest,
  registerStore as registerStoreRequest,
  updateProductPrice as updateProductPriceRequest,
  verifyStore as verifyStoreRequest
} from "../lib/api";
import type { Notice, ProductForm, ProviderForm, StoreForm } from "../lib/types";
import useAuth from "../hooks/useAuth";
import useCatalog from "../hooks/useCatalog";
import useNegotiations from "../hooks/useNegotiations";
import useStoreConversations from "../hooks/useStoreConversations";
import {
  ProductDetailPage,
  ProviderDetailPage,
  ServicesDirectoryPage,
  StoreConversationPage,
  StoreDetailPage,
  StoresDirectoryPage
} from "./PublicPages";

type StoreRegistration = StoreForm & { neighborhood?: string };

export default function MarketplacePage() {
  const [notice, setNotice] = useState<Notice>(null);
  const [busy, setBusy] = useState(false);
  const [apiHealth, setApiHealth] = useState<"checking" | "online" | "offline">("checking");
  const [priceDrafts, setPriceDrafts] = useState<Record<string, string>>({});
  const navigate = useNavigate();
  const dismissNotice = useCallback(() => setNotice(null), []);
  const auth = useAuth({ setNotice, setBusy });
  const catalogState = useCatalog(setNotice);
  const negotiationState = useNegotiations({ session: auth.session, setNotice, setBusy });
  const storeConversationState = useStoreConversations({ session: auth.session, setNotice, setBusy });
  const { session, profile, setProfile } = auth;
  const {
    catalog, catalogStatus, catalogError, search, setSearch, nearby, setNearby,
    coordinates, setCoordinates, visibleProducts, visibleServices, loadCatalog, locate
  } = catalogState;
  const {
    negotiations, pendingCount, selectedNegotiation, messageForm,
    start: startNegotiation, sendMessage, updateMessageField,
    respond: respondToProposal, complete: completeNegotiation
  } = negotiationState;
  const openStoreConversation = useCallback((id: string) => {
    void storeConversationState.open(id);
  }, [storeConversationState.open]);
  const sendStoreConversationMessage = useCallback((event: FormEvent<HTMLFormElement>, id: string) => {
    void storeConversationState.send(event, id);
  }, [storeConversationState.send]);

  useEffect(() => {
    void loadCatalog();
  }, [loadCatalog]);

  useEffect(() => {
    let active = true;
    const refreshApiHealth = async () => {
      try {
        const isHealthy = await checkApiHealth();
        if (active) setApiHealth(isHealthy ? "online" : "offline");
      } catch {
        if (active) setApiHealth("offline");
      }
    };
    void refreshApiHealth();
    const interval = window.setInterval(() => void refreshApiHealth(), 30_000);
    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, []);

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

  async function registerProvider(event: FormEvent<HTMLFormElement>, providerForm: ProviderForm): Promise<boolean> {
    event.preventDefault();
    const result = await runApi((currentSession) => registerProviderRequest(currentSession, providerForm));
    if (result) {
      setProfile((current) => current ? { ...current, role: "prestador" } : current);
      await loadCatalog();
      await navigate("/painel");
      return true;
    }
    return false;
  }

  async function registerStore(event: FormEvent<HTMLFormElement>, storeForm: StoreRegistration): Promise<boolean> {
    event.preventDefault();
    const result = await runApi((currentSession) => registerStoreRequest(currentSession, storeForm));
    if (result) {
      setProfile((current) => current ? {
        ...current,
        role: "lojista",
        store: {
          id: result.store.id,
          name: storeForm.name,
          slug: storeForm.slug,
          category: storeForm.category,
          description: storeForm.description,
          address: storeForm.address,
          latitude: storeForm.latitude ? Number(storeForm.latitude) : null,
          longitude: storeForm.longitude ? Number(storeForm.longitude) : null,
          verified: false
        }
      } : current);
      setNotice({ text: "Loja criada. Um administrador deve verificá-la antes da listagem pública." });
      await loadCatalog();
      await navigate("/painel");
      return true;
    }
    return false;
  }

  async function createProduct(event: FormEvent<HTMLFormElement>, product: ProductForm & { images?: string[] }): Promise<boolean> {
    event.preventDefault();
    const result = await runApi((currentSession) => createProductRequest(currentSession, product));
    if (result) {
      await loadCatalog();
      return true;
    }
    return false;
  }

  async function updateProductPrice(productId: string) {
    const price = Number(priceDrafts[productId]);
    const result = await runApi((currentSession) => updateProductPriceRequest(currentSession, productId, price));
    if (result) await loadCatalog();
  }

  async function createReview(review: Parameters<typeof createReviewRequest>[1]): Promise<boolean> {
    const result = await runApi((currentSession) => createReviewRequest(currentSession, review));
    return Boolean(result);
  }

  async function verifyStore(storeId: string) {
    const result = await runApi((currentSession) => verifyStoreRequest(currentSession, storeId));
    if (result) await loadCatalog();
  }

  function updateAccountProfile(values: { name: string; phone: string | null }) {
    return auth.updateAccountProfile(values);
  }

  async function startServiceNegotiation(serviceId: string) {
    if (await startNegotiation(serviceId)) await navigate("/negociacoes");
  }

  async function startStoreConversation(storeId: string, content: string, productId?: string) {
    const conversationId = await storeConversationState.start(storeId, content, productId);
    if (conversationId) return conversationId;
    return null;
  }

  function renderWorkspace() {
    if (!profile || !session) return null;
    return (
      <Workspace
        session={session}
        profile={profile}
        busy={busy}
        onRegisterStore={registerStore}
        onCreateProduct={createProduct}
        onRegisterProvider={registerProvider}
      />
    );
  }

  function renderDashboard() {
    if (!profile || !session) {
      return <section className="section"><p className="empty">Inicia sessão para aceder à área de gestão.</p></section>;
    }
    if (profile.role === "lojista") {
      return <MerchantDashboard session={session} refreshKey={catalog.products}>{renderWorkspace()}</MerchantDashboard>;
    }
    if (profile.role === "prestador") {
      return (
        <ProviderDashboard
          session={session}
          refreshCatalog={loadCatalog}
          onProfileChange={(changes) => setProfile((current) => current ? { ...current, ...changes } : current)}
        />
      );
    }
    if (profile.role === "admin") {
      return <AdminDashboard stores={catalog.mapStores} busy={busy} onVerify={(storeId) => void verifyStore(storeId)} />;
    }
    return renderWorkspace();
  }

  return (
    <main className="app-shell">
      <NoticeBanner notice={notice} onDismiss={dismissNotice} />
      <SiteHeader
        profile={profile}
        apiHealth={apiHealth}
        pendingNegotiations={pendingCount}
        showStoreConversations={profile?.role === "client" || profile?.role === "lojista"}
        onSignOut={() => void auth.signOut()}
      />
      <Routes>
        <Route path="/" element={
          <>
            <Hero />
            <Marketplace
              stores={catalog.stores}
              mapStores={catalog.mapStores}
              products={visibleProducts}
              services={visibleServices}
              providers={catalog.providers}
              profile={profile}
              busy={busy}
              search={search}
              nearby={nearby}
              coordinates={coordinates}
              mapLoading={catalogStatus === "loading"}
              mapError={catalogStatus === "error" ? catalogError : null}
              priceDrafts={priceDrafts}
              onSearchChange={setSearch}
              onLocate={locate}
              onClearLocation={() => { setNearby(false); setCoordinates(null); }}
              onClearFilters={() => setSearch("")}
              onPriceChange={(productId, value) => setPriceDrafts((current) => ({ ...current, [productId]: value }))}
              onUpdatePrice={(productId) => void updateProductPrice(productId)}
              onStartNegotiation={(serviceId) => void startServiceNegotiation(serviceId)}
              onReview={createReview}
            />
          </>
        } />
        <Route path="/negociacoes" element={
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
        } />
        <Route path="/painel" element={renderDashboard()} />
        <Route path="/lojas" element={<StoresDirectoryPage stores={catalog.stores} />} />
        <Route path="/lojas/:slug" element={
          <StoreDetailPage
            session={session}
            profile={profile}
            busy={busy}
            onReview={createReview}
            onStartStoreConversation={startStoreConversation}
          />
        } />
        <Route path="/produtos/:productId" element={
          <ProductDetailPage
            session={session}
            profile={profile}
            busy={busy}
            onStartStoreConversation={startStoreConversation}
          />
        } />
        <Route path="/servicos" element={<ServicesDirectoryPage providers={catalog.providers} services={catalog.services} />} />
        <Route path="/prestadores/:providerId" element={
          <ProviderDetailPage
            session={session}
            profile={profile}
            busy={busy}
            onReview={createReview}
            onStartNegotiation={(serviceId) => void startServiceNegotiation(serviceId)}
          />
        } />
        <Route path="/conversas" element={
          <StoreConversationPage
            session={session}
            profile={profile}
            conversations={storeConversationState.conversations}
            messages={storeConversationState.messages}
            message={storeConversationState.message}
            busy={busy}
            onMessageChange={storeConversationState.setMessage}
            onOpen={openStoreConversation}
            onSend={sendStoreConversationMessage}
          />
        } />
        <Route path="/conversas/:conversationId" element={
          <StoreConversationPage
            session={session}
            profile={profile}
            conversations={storeConversationState.conversations}
            messages={storeConversationState.messages}
            message={storeConversationState.message}
            busy={busy}
            onMessageChange={storeConversationState.setMessage}
            onOpen={openStoreConversation}
            onSend={sendStoreConversationMessage}
          />
        } />
        <Route path="/conta" element={
          session && profile
            ? <ProfileSettingsForm profile={profile} saving={auth.profileSaving} onSave={updateAccountProfile} />
            : <Account
                authMode={auth.authMode}
                authForm={auth.authForm}
                busy={busy}
                setAuthForm={auth.setAuthForm}
                onSubmit={auth.submitAuth}
                onToggleMode={() => auth.setAuthMode((current) => current === "login" ? "signup" : "login")}
              />
        } />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <SiteFooter />
    </main>
  );
}
