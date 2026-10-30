import { useState } from "react";
import { Activity, ArrowUpRight, BadgeCheck, BriefcaseBusiness, Clock3, Megaphone, Shield, ShieldCheck, Users, Zap } from "lucide-react";
import { api } from "../api.js";

export default function AdminDashboard({ batches, users, logs, prestadores, campanhasPrestadores, activeUser, onAction }) {
  const [promoteId, setPromoteId] = useState("");
  const canAdmin = ["admin", "supaadmin"].includes(activeUser?.role);
  const openBatch = batches.find((batch) => !batch.publicadoWeb && batch.adsIds.length > 0) ?? batches.find((batch) => batch.adsIds.length > 0);
  const eligibleBatch = batches.find((batch) => batch.liberadoMetaAds && !batch.publicadoMetaAds);
  const eligibleUsers = users.filter((user) => user.role === "cliente" || user.role === "lojista");

  async function verify(force = false) {
    await onAction(
      () => api("/lotes/verificar-regras", { method: "POST", body: { batchId: openBatch?.id, force30Min: force, adminId: activeUser.id } }),
      force ? "Simulação concluída: regra dos 30 minutos aplicada." : "Regras do lote verificadas."
    );
  }

  async function publishMeta() {
    await onAction(
      () => api(`/lotes/${eligibleBatch.id}/publicar-meta`, { method: "POST", body: { userId: activeUser.id } }),
      "Publicação Meta Ads registada no log."
    );
  }

  async function promote(event) {
    event.preventDefault();
    const succeeded = await onAction(
      () => api("/admin/promover", { method: "POST", body: { adminId: activeUser.id, userId: promoteId } }),
      "Utilizador promovido a Admin."
    );
    if (succeeded) setPromoteId("");
  }

  return (
    <section className="admin-page">
      <div className="page-heading"><span className="eyebrow">Operações da plataforma</span><h1>Painel de <em>controlo.</em></h1><p>Fila, regras de publicação e actividade administrativa.</p></div>
      {!canAdmin && <div className="inline-warning">Este painel é de demonstração. Alterne para Admin ou SupaAdmin para executar acções protegidas.</div>}
      <div className="admin-stats">
        <Stat icon={Users} label="Utilizadores" value={users.length} />
        <Stat icon={Activity} label="Lotes" value={batches.length} />
        <Stat icon={Megaphone} label="Na fila" value={batches.filter((batch) => !batch.publicadoWeb).reduce((sum, batch) => sum + batch.adsIds.length, 0)} />
        <Stat icon={BadgeCheck} label="Meta Ads prontos" value={batches.filter((batch) => batch.liberadoMetaAds && !batch.publicadoMetaAds).length} />
      </div>
      <ProviderAdminPanel prestadores={prestadores} campanhas={campanhasPrestadores} activeUser={activeUser} onAction={onAction} />
      <div className="admin-grid">
        <div className="admin-main-panel">
          <div className="panel-heading"><div><span className="eyebrow">Fila de anúncios</span><h2>Estado dos lotes</h2></div><span className="live-pill"><i /> AO VIVO</span></div>
          {batches.slice().reverse().map((batch) => <div className="admin-batch" key={batch.id}>
            <div className="admin-batch-top"><div><b>Lote {batch.id.slice(-7)} · {batch.plano}</b><small>{new Date(batch.CriadoEm).toLocaleString("pt-MZ")}</small></div><span className={batch.publicadoWeb ? "status-pill published" : "status-pill pending"}>{batch.publicadoWeb ? "Publicado Web" : "Em espera"}</span></div>
            <div className="batch-progress"><span><b>{batch.adsIds.length}</b> / 6 anúncios</span><span>Receita <b>{batch.receitaTotal} MT</b></span><div className="queue-meter"><i style={{ width: `${Math.min(batch.adsIds.length / 6 * 100, 100)}%` }} /></div></div>
            <div className="batch-ad-list">{(batch.ads ?? []).map((ad) => <span key={ad.id}>{ad.titulo}</span>)}</div>
            <div className="batch-rules"><span className={batch.publicadoWeb ? "rule-done" : ""}><Clock3 size={14} /> Web {batch.publicadoWeb ? "publicada" : "aguarda 6 ou 30 min"}</span><span className={batch.liberadoMetaAds ? "rule-done" : ""}><Shield size={14} /> Meta Ads {batch.liberadoMetaAds ? "libertado" : "requer 6 e ≥600 MT"}</span></div>
          </div>)}
          {!batches.length && <p className="muted-copy">Ainda não há lotes.</p>}
        </div>
        <aside className="admin-side">
          <div className="demo-card"><span className="demo-icon"><Zap size={19} fill="currentColor" /></span><span className="eyebrow">Demonstração ao vivo</span><h2>Avance a fila.</h2><p>Força a regra dos 30 minutos. Publica na Web agora, mas mantém o Meta Ads bloqueado se não cumprir os requisitos.</p>
            <button className="button button-orange" onClick={() => verify(true)} disabled={!canAdmin || !openBatch}>⚡ Simular +30 Minutos no Lote Atual</button>
            <button className="text-button" onClick={() => verify(false)} disabled={!canAdmin || !openBatch}>Verificar regras normalmente <ArrowUpRight size={14} /></button>
          </div>
          <div className="meta-card"><div className="panel-heading"><div><span className="eyebrow">Campanhas</span><h3>Meta Ads</h3></div><Megaphone size={18} /></div><p>Requer lote completo (6 anúncios) e receita mínima de 600 MT.</p>
            {eligibleBatch ? <button className="button button-dark" onClick={publishMeta} disabled={!canAdmin}>Publicar lote {eligibleBatch.id.slice(-6)} no Meta Ads <ArrowUpRight size={15} /></button> : <div className="locked-state"><Shield size={16} /> Nenhum lote cumpre os requisitos.</div>}
          </div>
          {activeUser?.role === "supaadmin" && <form className="promote-card" onSubmit={promote}><div className="panel-heading"><div><span className="eyebrow">Acesso e cargos</span><h3>Promover a Admin</h3></div><Users size={18} /></div><select required value={promoteId} onChange={(event) => setPromoteId(event.target.value)}><option value="">Escolha um utilizador</option>{eligibleUsers.map((user) => <option key={user.id} value={user.id}>{user.nome} · {user.role}</option>)}</select><button className="button button-dark" disabled={!promoteId}>Promover utilizador</button></form>}
        </aside>
      </div>
      <section className="logs-panel"><div className="panel-heading"><div><span className="eyebrow">Rastreabilidade</span><h2>Registo de actividade</h2></div><Activity size={18} /></div>
        {!logs.length && <p className="muted-copy">As acções administrativas ficam registadas aqui.</p>}
        {logs.map((log) => <div className="log-row" key={log.id}><span className="log-dot" /><b>{log.adminNome}</b><span>{log.acao}</span><small>{new Date(log.hora).toLocaleString("pt-MZ")}</small></div>)}
      </section>
    </section>
  );
}

function ProviderAdminPanel({ prestadores, campanhas, activeUser, onAction }) {
  const canAdmin = ["admin", "supaadmin"].includes(activeUser?.role);
  return (
    <section className="provider-admin-panel">
      <div className="panel-heading"><div><span className="eyebrow">Subscrições mensais</span><h2>Prestadores de serviços</h2></div><BriefcaseBusiness size={19} /></div>
      <p className="muted-copy">Revise contas e serviços antes da publicação. Registe aqui as campanhas externas feitas pela equipa.</p>
      {!prestadores.length && <div className="queue-empty">Ainda não há prestadores registados.</div>}
      <div className="provider-admin-list">{prestadores.map((provider) => <ProviderAdminCard key={provider.id} provider={provider} campanhas={campanhas.filter((campaign) => campaign.providerId === provider.id)} activeUser={activeUser} canAdmin={canAdmin} onAction={onAction} />)}</div>
    </section>
  );
}

function ProviderAdminCard({ provider, campanhas, activeUser, canAdmin, onAction }) {
  const [plataforma, setPlataforma] = useState("Facebook");
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const active = provider.estadoSubscricao === "ativa";
  const approved = provider.estadoRevisao === "aprovado";
  const campaignsAvailable = provider.campanhasUsadas < provider.campanhasMensais;

  async function approve() {
    await onAction(
      () => api(`/admin/prestadores/${provider.id}/aprovar`, { method: "POST", body: { adminId: activeUser.id } }),
      `Perfil de ${provider.nome} aprovado.`
    );
  }

  async function publishService(service) {
    await onAction(
      () => api(`/admin/prestadores/${provider.id}/servicos/${service.id}/publicar`, { method: "POST", body: { adminId: activeUser.id } }),
      `Serviço "${service.titulo}" publicado.`
    );
  }

  async function submitCampaign(event) {
    event.preventDefault();
    setBusy(true);
    try {
      const succeeded = await onAction(
        () => api(`/admin/prestadores/${provider.id}/campanhas`, { method: "POST", body: { adminId: activeUser.id, plataforma, url } }),
        `Campanha ${plataforma} registada para ${provider.nome}.`
      );
      if (succeeded) setUrl("");
    } finally {
      setBusy(false);
    }
  }

  return (
    <article className="provider-admin-card">
      <div className="provider-admin-head"><div><b>{provider.nome}</b><small>{provider.telefone} · {provider.bairro}</small></div><span className={active ? "status-pill published" : "status-pill pending"}>{active ? `${provider.plano} · ${provider.valorMensal} MT/mês` : "Subscrição expirada"}</span></div>
      <div className="provider-admin-state"><span className={approved ? "rule-done" : ""}><ShieldCheck size={14} /> Perfil {approved ? "aprovado" : "aguarda aprovação"}</span><span><Megaphone size={14} /> Campanhas {provider.campanhasUsadas}/{provider.campanhasMensais}</span><span><Clock3 size={14} /> Ciclo até {new Date(provider.fimCiclo).toLocaleDateString("pt-MZ")}</span></div>
      {!approved && <button className="button button-dark provider-approve-button" disabled={!canAdmin} onClick={approve}>Aprovar perfil do prestador</button>}
      <div className="provider-admin-services">{provider.servicos.map((service) => <div className="provider-admin-service" key={service.id}><span><b>{service.titulo}</b><small>{service.status === "publicado" ? "Publicado na loja" : "A aguardar revisão"} · {Number(service.preco).toLocaleString("pt-MZ")} MT</small></span>{service.status !== "publicado" && <button className="button button-secondary" disabled={!canAdmin || !approved || !active} onClick={() => publishService(service)}>Publicar serviço</button>}</div>)}</div>
      <form className="provider-campaign-form" onSubmit={submitCampaign}><b>Registar publicação externa</b><div><select aria-label={`Plataforma para ${provider.nome}`} value={plataforma} onChange={(event) => setPlataforma(event.target.value)}><option>Facebook</option><option>Instagram</option><option>TikTok</option><option>WhatsApp</option></select><input type="url" value={url} onChange={(event) => setUrl(event.target.value)} placeholder="Link da publicação (opcional)" /></div><button className="button button-dark" disabled={!canAdmin || !approved || !active || !campaignsAvailable || busy}>{busy ? "A guardar..." : campaignsAvailable ? `Registar campanha (${provider.campanhasMensais - provider.campanhasUsadas} disponíveis)` : "Limite mensal atingido"}</button></form>
      {!!campanhas.length && <div className="provider-admin-campaigns">{campanhas.slice(0, 3).map((campaign) => <span key={campaign.id}>{campaign.plataforma} · {campaign.adminNome} · {new Date(campaign.hora).toLocaleDateString("pt-MZ")}</span>)}</div>}
    </article>
  );
}

function Stat({ icon: Icon, label, value }) {
  return <div className="stat-card"><span className="stat-icon"><Icon size={18} /></span><span>{label}</span><b>{value}</b></div>;
}
