import { useState } from "react";
import { ArrowUpRight, BadgeCheck, BriefcaseBusiness, CalendarClock, Megaphone, Plus, ShieldCheck, Sparkles } from "lucide-react";

const plans = [
  { id: "basico", name: "Básico", price: 1000, campaigns: 2, description: "2 campanhas externas por mês + publicação na plataforma." },
  { id: "premium", name: "Premium", price: 1500, campaigns: 4, description: "4 campanhas externas + destaque e prioridade." }
];

const emptyListing = { titulo: "", descricao: "", preco: "", fotoUrl: "" };

export default function ProviderDashboard({ provider, user, onChangePlan, onSubmitListing, onNotify }) {
  const [planBusy, setPlanBusy] = useState(false);
  const [listingBusy, setListingBusy] = useState(false);
  const [listing, setListing] = useState(emptyListing);
  const [preview, setPreview] = useState("");
  if (!provider) return <section className="provider-page"><div className="empty-state">Não encontrámos o perfil deste prestador. Volte a registar-se ou escolha outra conta de apresentação.</div></section>;

  const activePlan = plans.find((plan) => plan.id === provider.plano) ?? plans[0];
  const remaining = Math.max(0, provider.campanhasMensais - provider.campanhasUsadas);
  const isActive = provider.estadoSubscricao === "ativa";

  async function changePlan(planId) {
    setPlanBusy(true);
    try {
      await onChangePlan(planId);
    } catch (error) {
      onNotify(error.message, true);
    } finally {
      setPlanBusy(false);
    }
  }

  function handlePhoto(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) return onNotify("Escolha um ficheiro de imagem.", true);
    if (file.size > 5 * 1024 * 1024) return onNotify("A imagem deve ter no máximo 5 MB.", true);
    const reader = new FileReader();
    reader.onload = () => {
      const image = String(reader.result);
      setPreview(image);
      setListing((current) => ({ ...current, fotoUrl: image }));
    };
    reader.onerror = () => onNotify("Não foi possível ler esta imagem.", true);
    reader.readAsDataURL(file);
  }

  async function submitListing(event) {
    event.preventDefault();
    if (!listing.fotoUrl) return onNotify("Adicione uma fotografia para o serviço.", true);
    setListingBusy(true);
    try {
      await onSubmitListing({ ...listing, bairro: provider.bairro });
      setListing(emptyListing);
      setPreview("");
    } catch (error) {
      onNotify(error.message, true);
    } finally {
      setListingBusy(false);
    }
  }

  return (
    <section className="provider-page">
      <div className="page-heading"><span className="eyebrow">Painel do prestador</span><h1>Bem-vindo, <em>{provider.nome}.</em></h1><p>Consulte a sua subscrição, as campanhas mensais e os serviços publicados.</p></div>
      <div className="provider-dashboard-grid">
        <div className="provider-dashboard-main">
          <section className="provider-subscription-card">
            <div className="provider-subscription-head"><span className="provider-side-mark"><BriefcaseBusiness size={20} /></span><div><span className="eyebrow">Categoria Individual</span><h2>Plano {activePlan.name}</h2></div><span className={isActive ? "status-pill published" : "status-pill pending"}>{isActive ? "Subscrição activa" : "Subscrição expirada"}</span></div>
            <div className="provider-subscription-details">
              <span><b>{provider.valorMensal.toLocaleString("pt-MZ")} MT</b><small>por mês</small></span>
              <span><b>{remaining} de {provider.campanhasMensais}</b><small>campanhas externas disponíveis</small></span>
              <span><b>{provider.estadoRevisao === "aprovado" ? "Aprovado" : "Em revisão"}</b><small>estado do perfil</small></span>
            </div>
            <div className="provider-cycle"><CalendarClock size={15} /> {isActive ? `Ciclo mensal termina em ${new Date(provider.fimCiclo).toLocaleDateString("pt-MZ")}` : "Renove para voltar a enviar serviços e usar campanhas."}</div>
          </section>

          <section className="provider-dashboard-card">
            <div className="panel-heading"><div><span className="eyebrow">Gerir subscrição</span><h2>Mudar ou renovar plano</h2></div><ArrowUpRight size={18} /></div>
            <p className="muted-copy">A mudança é imediata na simulação: novo pagamento mensal e novo ciclo de 30 dias.</p>
            <div className="provider-plan-options">
              {plans.map((plan) => <article className={provider.plano === plan.id && isActive ? "provider-plan current" : "provider-plan"} key={plan.id}>
                <span className="provider-plan-name">{plan.name}{plan.id === "premium" && <Sparkles size={13} />}</span><b>{plan.price.toLocaleString("pt-MZ")} MT<small>/mês</small></b><span className="provider-plan-description">{plan.description}</span>
                <button className={provider.plano === plan.id && isActive ? "button button-secondary" : "button button-dark"} disabled={planBusy || (provider.plano === plan.id && isActive)} onClick={() => changePlan(plan.id)}>{planBusy ? "A processar..." : provider.plano === plan.id && isActive ? "Plano actual" : provider.estadoSubscricao === "expirada" ? "Renovar este plano" : "Mudar para este plano"}</button>
              </article>)}
            </div>
            <div className="provider-enterprise">PLANO EMPRESARIAL <span>Indisponível</span></div>
          </section>

          <section className="provider-dashboard-card">
            <div className="panel-heading"><div><span className="eyebrow">A sua loja</span><h2>Serviços submetidos</h2></div><BadgeCheck size={18} /></div>
            <p className="muted-copy">Só o Admin publica os serviços na loja e no mapa depois de os rever.</p>
            <div className="provider-listings">{provider.servicos.map((service) => <div className="provider-listing-row" key={service.id}><img src={service.fotoUrl} alt="" /><span><b>{service.titulo}</b><small>{service.bairro} · {Number(service.preco).toLocaleString("pt-MZ")} MT</small></span><span className={service.status === "publicado" ? "status-pill published" : "status-pill pending"}>{service.status === "publicado" ? "Publicado" : "Em revisão"}</span></div>)}</div>
            {isActive && <form className="provider-listing-form" onSubmit={submitListing}>
              <h3><Plus size={15} /> Submeter outro serviço</h3>
              <div className="form-grid">
                <label className="field full">Nome do serviço<input required maxLength="90" value={listing.titulo} onChange={(event) => setListing({ ...listing, titulo: event.target.value })} /></label>
                <label className="field">Preço indicativo (MT)<input required type="number" min="1" value={listing.preco} onChange={(event) => setListing({ ...listing, preco: event.target.value })} /></label>
                <label className="field">Fotografia<span className="file-picker provider-file-picker"><Plus size={14} /> Escolher<input type="file" accept="image/*" onChange={handlePhoto} /></span></label>
                {preview && <img className="form-preview provider-preview" src={preview} alt="Pré-visualização do serviço" />}
                <label className="field full">Descrição<textarea required maxLength="600" rows="2" value={listing.descricao} onChange={(event) => setListing({ ...listing, descricao: event.target.value })} /></label>
              </div>
              <button className="button button-dark" disabled={listingBusy}>{listingBusy ? "A enviar..." : "Enviar para revisão do Admin"}</button>
            </form>}
          </section>
        </div>

        <aside className="provider-dashboard-side">
          <section className="provider-campaign-card"><span className="provider-side-mark"><Megaphone size={20} /></span><span className="eyebrow">Campanhas externas</span><h2>{remaining} <small>disponíveis</small></h2><p>A equipa regista cada publicação feita noutras plataformas. Não precisa de gerir lotes ou anúncios avulsos.</p>
            <div className="campaign-progress"><i style={{ width: `${provider.campanhasMensais ? provider.campanhasUsadas / provider.campanhasMensais * 100 : 0}%` }} /></div>
            <div className="campaign-usage">{provider.campanhasUsadas} de {provider.campanhasMensais} usadas neste mês</div>
            <div className="campaign-history">{provider.campanhas.map((campaign) => <div className="campaign-history-row" key={campaign.id}><span>{campaign.plataforma}</span><small>{new Date(campaign.hora).toLocaleDateString("pt-MZ")}</small></div>)}{!provider.campanhas.length && <p className="muted-copy">Ainda sem campanhas externas registadas.</p>}</div>
          </section>
          <section className="provider-how-card"><ShieldCheck size={20} /><h3>Publicação acompanhada</h3><p>O Admin valida o seu perfil, publica os serviços e regista as campanhas do plano.</p><span>{provider.contacto} · {provider.telefone}</span><small>{provider.bairro}</small></section>
          {provider.plano === "premium" && <section className="provider-premium-note"><Sparkles size={17} /><b>Benefícios Premium</b><span>Área especial na página inicial, posição superior e prioridade nas pesquisas e filtros.</span></section>}
        </aside>
      </div>
    </section>
  );
}
