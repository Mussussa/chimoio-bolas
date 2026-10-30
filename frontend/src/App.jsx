import { useEffect, useMemo, useState } from "react";
import { ArrowRight, BriefcaseBusiness, Compass, Download, Home, MapPinned, Megaphone, Store, Zap } from "lucide-react";
import { api } from "./api.js";
import CarouselHome from "./components/CarouselHome.jsx";
import MapExplorer from "./components/MapExplorer.jsx";
import CreateAdQueue from "./components/CreateAdQueue.jsx";
import AdminDashboard from "./components/AdminDashboard.jsx";
import StoreModal from "./components/StoreModal.jsx";
import ProviderDashboard from "./components/ProviderDashboard.jsx";
import ProviderRegistration from "./components/ProviderRegistration.jsx";

const tabs = [
  { id: "home", label: "Explorar", icon: Home },
  { id: "mapa", label: "Mapa", icon: MapPinned },
  { id: "anuncio", label: "Anunciar", icon: Megaphone },
  { id: "prestador", label: "Prestador", icon: BriefcaseBusiness },
  { id: "admin", label: "Painel", icon: Compass }
];

export default function App() {
  const [state, setState] = useState({ users: [], stores: [], ads: [], batches: [], prestadores: [], campanhasPrestadores: [], adminLogs: [] });
  const [activeUserId, setActiveUserId] = useState("u-cliente");
  const [tab, setTab] = useState("home");
  const [selectedStore, setSelectedStore] = useState(null);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [installPrompt, setInstallPrompt] = useState(null);
  const activeUser = useMemo(() => state.users.find((user) => user.id === activeUserId) ?? state.users[0], [state.users, activeUserId]);
  const activeProvider = useMemo(() => state.prestadores.find((provider) => provider.ownerId === activeUserId), [state.prestadores, activeUserId]);

  async function refresh() {
    const result = await api("/state");
    setState(result);
  }

  useEffect(() => {
    refresh().catch((err) => setError(err.message));
    const refreshTimer = window.setInterval(() => refresh().catch((err) => setError(err.message)), 15000);
    return () => window.clearInterval(refreshTimer);
  }, []);

  useEffect(() => {
    const captureInstallPrompt = (event) => {
      event.preventDefault();
      setInstallPrompt(event);
    };
    const clearInstallPrompt = () => setInstallPrompt(null);
    window.addEventListener("beforeinstallprompt", captureInstallPrompt);
    window.addEventListener("appinstalled", clearInstallPrompt);
    return () => {
      window.removeEventListener("beforeinstallprompt", captureInstallPrompt);
      window.removeEventListener("appinstalled", clearInstallPrompt);
    };
  }, []);

  async function installApp() {
    if (!installPrompt) return;
    await installPrompt.prompt();
    await installPrompt.userChoice;
    setInstallPrompt(null);
  }

  async function runAction(action, successMessage) {
    setError("");
    setNotice("");
    try {
      await action();
      await refresh();
      setNotice(successMessage);
      return true;
    } catch (err) {
      setError(err.message);
      return false;
    }
  }

  async function registerProvider(form) {
    setError("");
    try {
      const result = await api("/prestadores/registar", { method: "POST", body: form });
      await refresh();
      setActiveUserId(result.user.id);
      setTab("prestador");
      setNotice(`Conta criada. Pagamento mensal de ${result.pagamento.valor.toLocaleString("pt-MZ")} MT simulado com sucesso. O perfil aguarda aprovação do Admin.`);
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }

  async function changeProviderPlan(plan) {
    setError("");
    try {
      const result = await api(`/prestadores/${activeProvider.id}/plano`, { method: "POST", body: { userId: activeUserId, plano: plan } });
      await refresh();
      setNotice(`Plano ${result.prestador.plano} activo. Pagamento mensal de ${result.pagamento.valor.toLocaleString("pt-MZ")} MT simulado; novo ciclo de 30 dias iniciado.`);
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }

  async function submitProviderListing(form) {
    setError("");
    try {
      await api(`/prestadores/${activeProvider.id}/servicos`, { method: "POST", body: { ...form, userId: activeUserId } });
      await refresh();
      setNotice("Serviço enviado para revisão do Admin. Só será publicado após aprovação.");
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }

  function providerNotify(message, failed = false) {
    setNotice(failed ? "" : message);
    setError(failed ? message : "");
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <button className="brand" onClick={() => setTab("home")} aria-label="Ir para início">
          <span className="brand-mark"><Zap size={20} fill="currentColor" /></span>
          <span><b>chimoio</b><small> BOLADAS</small></span>
        </button>
        <nav className="desktop-nav" aria-label="Navegação principal">
          {tabs.map(({ id, label }) => <button key={id} className={tab === id ? "nav-link active" : "nav-link"} onClick={() => setTab(id)}>{label}</button>)}
        </nav>
        {installPrompt && <button className="install-app" onClick={installApp}><Download size={15} /> Instalar app</button>}
        <label className="role-switcher">
          <span>Apresentar como</span>
          <select value={activeUserId} onChange={(event) => setActiveUserId(event.target.value)}>
            {state.users.map((user) => <option key={user.id} value={user.id}>{user.role === "supaadmin" ? "SupaAdmin" : user.role === "admin" ? "Admin" : user.role === "lojista" ? `Lojista · ${user.nome}` : user.role === "prestador" ? `Prestador · ${user.nome}` : `Cliente · ${user.nome}`}</option>)}
          </select>
        </label>
      </header>

      <main>
        {notice && <div className="toast success">{notice}<button onClick={() => setNotice("")}>×</button></div>}
        {error && <div className="toast failure">{error}<button onClick={() => setError("")}>×</button></div>}
        {tab === "home" && <CarouselHome ads={state.ads} prestadores={state.prestadores} activeUser={activeUser} onOpenStore={setSelectedStore} />}
        {tab === "mapa" && <MapExplorer stores={state.stores} ads={state.ads} activeUser={activeUser} onOpenStore={setSelectedStore} />}
        {tab === "anuncio" && (activeUser?.role === "prestador"
          ? <ProviderDashboard provider={activeProvider} user={activeUser} onChangePlan={changeProviderPlan} onSubmitListing={submitProviderListing} onNotify={providerNotify} />
          : <CreateAdQueue batches={state.batches} activeUser={activeUser} onCreated={refresh} onNotify={providerNotify} />)}
        {tab === "prestador" && (activeProvider
          ? <ProviderDashboard provider={activeProvider} user={activeUser} onChangePlan={changeProviderPlan} onSubmitListing={submitProviderListing} onNotify={providerNotify} />
          : <ProviderRegistration onRegistered={registerProvider} onNotify={providerNotify} />)}
        {tab === "admin" && <AdminDashboard batches={state.batches} users={state.users} prestadores={state.prestadores} campanhasPrestadores={state.campanhasPrestadores} logs={state.adminLogs} activeUser={activeUser} onAction={runAction} />}
      </main>
      <footer><span><Store size={15} /> Negócios da nossa cidade, mais perto de si.</span><span>Chimoio, Moçambique <ArrowRight size={14} /></span></footer>

      <nav className="mobile-nav" aria-label="Navegação móvel">
        {tabs.map(({ id, label, icon: Icon }) => <button key={id} className={tab === id ? "mobile-link active" : "mobile-link"} onClick={() => setTab(id)}><Icon size={19} /><span>{label}</span></button>)}
      </nav>
      {selectedStore && <StoreModal store={selectedStore} activeUser={activeUser} onClose={() => setSelectedStore(null)} onNotify={(message, failed = false) => { setNotice(failed ? "" : message); setError(failed ? message : ""); }} onRefresh={refresh} />}
    </div>
  );
}
