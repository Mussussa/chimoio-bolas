import { lazy, Suspense, useCallback, useEffect, useState, type FormEvent } from "react";
import type { Session } from "@supabase/supabase-js";
import { Navigate, Route, Routes, useNavigate } from "react-router-dom";
import { Hero, NoticeBanner, SiteFooter, SiteHeader, VisitorGuide } from "../components/layout/SiteChrome";
import Marketplace from "../components/marketplace/Marketplace";
import ContactSafetyDialog from "../components/marketplace/ContactSafetyDialog";
import {
  createProduct as createProductRequest,
  createReview as createReviewRequest,
  registerProvider as registerProviderRequest,
  registerStore as registerStoreRequest,
  updateProductPrice as updateProductPriceRequest,
  verifyStore as verifyStoreRequest
} from "../lib/api";
import type { PublicReview, ReviewSubmission } from "../lib/api";
import type { Notice, ProductForm, ProfileUpdate, ProviderForm, StoreForm } from "../lib/types";
import useAuth from "../hooks/useAuth";
import useCatalog from "../hooks/useCatalog";
import useNegotiations from "../hooks/useNegotiations";
import useStoreConversations from "../hooks/useStoreConversations";

const AdminDashboard = lazy(() => import("./AdminDashboard"));
const Account = lazy(() => import("../components/auth/Account"));
const ProfileSettingsForm = lazy(() => import("../components/auth/ProfileSettingsForm"));
const MessagesCenter = lazy(() => import("../components/messages/MessagesCenter"));
const LegacyStoreConversationRedirect = lazy(() =>
  import("../components/messages/MessagesCenter").then(({ LegacyStoreConversationRedirect: component }) => ({ default: component }))
);
const Workspace = lazy(() => import("../components/workspace/Workspace"));
const MerchantDashboard = lazy(() => import("./MerchantDashboard"));
const ProviderDashboard = lazy(() => import("./ProviderDashboard"));
const InformationPage = lazy(() => import("./InformationPage"));
const ProductDetailPage = lazy(() => import("./ProductDetailPage"));
const ProviderDetailPage = lazy(() => import("./ProviderDetailPage"));
const StoreDetailPage = lazy(() => import("./StoreDetailPage"));
const ProductsDirectoryPage = lazy(() =>
  import("./DirectoryPages").then(({ ProductsDirectoryPage: component }) => ({ default: component }))
);
const ServicesDirectoryPage = lazy(() =>
  import("./DirectoryPages").then(({ ServicesDirectoryPage: component }) => ({ default: component }))
);
const StoresDirectoryPage = lazy(() =>
  import("./DirectoryPages").then(({ StoresDirectoryPage: component }) => ({ default: component }))
);

function RouteLoadingFallback() {
  return (
    <section className="grid min-h-[50vh] place-items-center px-5 py-12 text-sm text-[var(--muted)]" role="status" aria-live="polite">
      A carregar página…
    </section>
  );
}

type StoreRegistration = StoreForm & { neighborhood?: string };
type ContactSafetyPrompt = Readonly<{
  onContinue: () => Promise<void>;
  onCancel: () => void;
}>;

export default function MarketplacePage() {
  const [notice, setNotice] = useState<Notice>(null);
  const [busy, setBusy] = useState(false);
  const [priceDrafts, setPriceDrafts] = useState<Record<string, string>>({});
  const [contactSafetyPrompt, setContactSafetyPrompt] = useState<ContactSafetyPrompt | null>(null);
  const navigate = useNavigate();
  const dismissNotice = useCallback(() => setNotice(null), []);
  const auth = useAuth({ setNotice, setBusy });
  const catalogState = useCatalog(setNotice);
  const negotiationState = useNegotiations({ session: auth.session, setNotice, setBusy });
  const storeConversationState = useStoreConversations({ session: auth.session, setNotice, setBusy });
  const { session, profile, setProfile } = auth;
  const {
    catalog, catalogStatus, catalogError, search, setSearch, nearby, setNearby,
    coordinates, setCoordinates, selectedNeighborhood, selectNeighborhood,
    visibleProducts, visibleServices, loadCatalog, locate
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

  const runApi = useCallback(async <T,>(request: (currentSession: Session) => Promise<T>): Promise<T | null> => {
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
  }, [session, setNotice, setBusy]);

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

  const createReview = useCallback(async (review: ReviewSubmission): Promise<PublicReview | null> => {
    const result = await runApi((currentSession) => createReviewRequest(currentSession, review));
    if (!result) return null;
    await loadCatalog();
    return result.review;
  }, [loadCatalog, runApi]);

  async function verifyStore(storeId: string) {
    const result = await runApi((currentSession) => verifyStoreRequest(currentSession, storeId));
    if (result) await loadCatalog();
  }

  function updateAccountProfile(values: ProfileUpdate, avatarFile: File | null) {
    return auth.updateAccountProfile(values, avatarFile);
  }

  function startServiceNegotiation(serviceId: string) {
    setContactSafetyPrompt({
      onContinue: async () => {
        if (await startNegotiation(serviceId)) await navigate("/mensagens?assunto=servicos");
      },
      onCancel: () => setContactSafetyPrompt(null)
    });
  }

  function startStoreConversation(storeId: string, content: string, productId?: string): Promise<string | null> {
    return new Promise((resolve) => {
      setContactSafetyPrompt({
        onContinue: async () => {
          resolve(await storeConversationState.start(storeId, content, productId));
        },
        onCancel: () => {
          resolve(null);
          setContactSafetyPrompt(null);
        }
      });
    });
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
      return <section className="px-[clamp(20px,7vw,100px)] py-[70px] max-[560px]:py-12"><p className="col-span-full rounded-[10px] border border-dashed border-[#cbd8de] p-6 text-center text-[13px] text-[#716e60]">Inicia sessão para aceder à área de gestão.</p></section>;
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
    <main className="mx-auto min-h-screen max-w-[1440px] overflow-hidden bg-[#fbfaf6] pt-[82px] max-[560px]:pt-[130px]">
      <NoticeBanner notice={notice} onDismiss={dismissNotice} />
      <SiteHeader
        profile={profile}
        pendingNegotiations={pendingCount}
        onSignOut={() => void auth.signOut()}
      />
      {contactSafetyPrompt && (
        <ContactSafetyDialog
          onContinue={contactSafetyPrompt.onContinue}
          onCancel={contactSafetyPrompt.onCancel}
        />
      )}
      <Suspense fallback={<RouteLoadingFallback />}>
      <Routes>
        <Route path="/" element={
          <>
            <Hero />
            <VisitorGuide />
            <Marketplace
              stores={catalog.stores}
              mapStores={catalog.mapStores}
              products={visibleProducts}
              services={visibleServices}
              providers={catalog.providers}
              providerReviews={catalog.providerReviews}
              profile={profile}
              busy={busy}
              search={search}
              nearby={nearby}
              coordinates={coordinates}
              selectedNeighborhood={selectedNeighborhood}
              mapLoading={catalogStatus === "loading"}
              mapError={catalogStatus === "error" ? catalogError : null}
              priceDrafts={priceDrafts}
              onSearchChange={setSearch}
              onLocate={locate}
              onSelectNeighborhood={selectNeighborhood}
              onClearLocation={() => { setNearby(false); setCoordinates(null); }}
              onPriceChange={(productId, value) => setPriceDrafts((current) => ({ ...current, [productId]: value }))}
              onUpdatePrice={(productId) => void updateProductPrice(productId)}
              onStartStoreConversation={startStoreConversation}
              onStartNegotiation={(serviceId) => void startServiceNegotiation(serviceId)}
              onReview={createReview}
            />
          </>
        } />
        <Route path="/mensagens" element={
          <MessagesCenter
            profile={profile}
            session={session}
            sessionExists={Boolean(session)}
            negotiations={negotiations}
            busy={busy}
            selectedNegotiation={selectedNegotiation}
            messageForm={messageForm}
            conversations={storeConversationState.conversations}
            storeMessages={storeConversationState.messages}
            storeMessage={storeConversationState.message}
            onSelectField={updateMessageField}
            onSendMessage={sendMessage}
            onRespondToProposal={(negotiationId, messageId, action) => void respondToProposal(negotiationId, messageId, action)}
            onComplete={(negotiationId) => void completeNegotiation(negotiationId)}
            onStoreMessageChange={storeConversationState.setMessage}
            onOpenStoreConversation={openStoreConversation}
            onSendStoreMessage={sendStoreConversationMessage}
          />
        } />
        <Route path="/mensagens/lojas/:conversationId" element={
          <MessagesCenter
            profile={profile}
            session={session}
            sessionExists={Boolean(session)}
            negotiations={negotiations}
            busy={busy}
            selectedNegotiation={selectedNegotiation}
            messageForm={messageForm}
            conversations={storeConversationState.conversations}
            storeMessages={storeConversationState.messages}
            storeMessage={storeConversationState.message}
            onSelectField={updateMessageField}
            onSendMessage={sendMessage}
            onRespondToProposal={(negotiationId, messageId, action) => void respondToProposal(negotiationId, messageId, action)}
            onComplete={(negotiationId) => void completeNegotiation(negotiationId)}
            onStoreMessageChange={storeConversationState.setMessage}
            onOpenStoreConversation={openStoreConversation}
            onSendStoreMessage={sendStoreConversationMessage}
          />
        } />
        <Route path="/negociacoes" element={<Navigate to="/mensagens?assunto=servicos" replace />} />
        <Route path="/painel" element={renderDashboard()} />
        <Route path="/produtos" element={
          <ProductsDirectoryPage
            products={catalog.products}
            stores={catalog.stores}
            mapStores={catalog.mapStores}
            query={search}
            onQueryChange={setSearch}
            gps={coordinates}
            mapLoading={catalogStatus === "loading"}
            mapError={catalogStatus === "error" ? catalogError : null}
            onLocate={locate}
            onClearLocation={() => { setNearby(false); setCoordinates(null); }}
            profile={profile}
            busy={busy}
            onStartStoreConversation={startStoreConversation}
          />
        } />
        <Route path="/lojas" element={
          <StoresDirectoryPage
            stores={catalog.stores}
            mapStores={catalog.mapStores}
            query={search}
            onQueryChange={setSearch}
            gps={coordinates}
            mapLoading={catalogStatus === "loading"}
            mapError={catalogStatus === "error" ? catalogError : null}
            onLocate={locate}
            onClearLocation={() => { setNearby(false); setCoordinates(null); }}
            profile={profile}
            busy={busy}
            onStartStoreConversation={startStoreConversation}
          />
        } />
        <Route path="/lojas/:slug" element={
          <StoreDetailPage
            session={session}
            profile={profile}
            busy={busy}
            onReview={createReview}
            onStartStoreConversation={startStoreConversation}
          />
        } />
        <Route path="/produtos/:productId" element={<ProductDetailPage />} />
        <Route path="/servicos" element={
          <ServicesDirectoryPage
            providers={catalog.providers}
            services={catalog.services}
            query={search}
            onQueryChange={setSearch}
            mapStores={catalog.mapStores}
            gps={coordinates}
            mapLoading={catalogStatus === "loading"}
            mapError={catalogStatus === "error" ? catalogError : null}
            onLocate={locate}
            onClearLocation={() => { setNearby(false); setCoordinates(null); }}
            profile={profile}
            busy={busy}
            onStartNegotiation={(serviceId) => void startServiceNegotiation(serviceId)}
          />
        } />
        <Route path="/prestadores/:providerId" element={
          <ProviderDetailPage
            profile={profile}
            busy={busy}
            onReview={createReview}
            onStartNegotiation={(serviceId) => void startServiceNegotiation(serviceId)}
          />
        } />
        <Route path="/seguranca" element={<InformationPage type="seguranca" />} />
        <Route path="/privacidade" element={<InformationPage type="privacidade" />} />
        <Route path="/termos" element={<InformationPage type="termos" />} />
        <Route path="/conversas" element={<Navigate to="/mensagens?assunto=lojas" replace />} />
        <Route path="/conversas/:conversationId" element={<LegacyStoreConversationRedirect />} />
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
      </Suspense>
      <SiteFooter />
    </main>
  );
}
