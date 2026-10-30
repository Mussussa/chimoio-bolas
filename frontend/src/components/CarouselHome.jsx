import { useState } from "react";
import { ArrowUpRight, BriefcaseBusiness, MapPin, MessageCircle, Sparkles } from "lucide-react";
import GeminiChatModal from "./GeminiChatModal.jsx";

const planLabels = { premium: "Premium", destaque: "Destaque", basico: "Básico" };

export default function CarouselHome({ ads, prestadores, activeUser, onOpenStore }) {
  const [chatAd, setChatAd] = useState(null);
  const published = ads.filter((ad) => ad.status === "publicado");
  const premiumProviders = prestadores
    .filter((provider) => provider.estadoSubscricao === "ativa" && provider.estadoRevisao === "aprovado" && provider.plano === "premium")
    .flatMap((provider) => provider.servicos
      .filter((service) => service.status === "publicado")
      .map((service) => ({ ...service, provider })));
  const premium = published.filter((ad) => ad.plano === "premium");
  const highlights = published.filter((ad) => ad.plano === "destaque");
  const regular = published.filter((ad) => ad.plano !== "premium" && ad.plano !== "destaque");

  return (
    <>
      <section className="hero">
        <div className="hero-copy">
          <span className="eyebrow"><span className="live-dot" /> A cidade está cheia de oportunidades</span>
          <h1>O melhor de<br /><em>Chimoio,</em> mesmo aqui.</h1>
          <p>Descubra produtos e serviços incríveis dos negócios locais. Perto de si, feitos por gente da nossa cidade.</p>
          <a className="button button-light" href="#anuncios">Ver oportunidades <ArrowUpRight size={17} /></a>
          <div className="hero-footnote"><MapPin size={15} /> Cimento · Soalpo · Vila Nova e mais</div>
        </div>
        <div className="hero-art">
          <div className="sun-disc" />
          <div className="hero-photo" />
          <div className="floating-note"><span>✳</span><div><b>Feito cá.</b><small>Escolhido por si.</small></div></div>
          <div className="hero-stamp">CHIMOIO<br />É NOSSO</div>
        </div>
        <div className="hero-index">01 <i /> 04</div>
      </section>

      {premiumProviders.length > 0 && <section className="provider-featured-section">
        <div className="provider-featured-heading"><div><span className="eyebrow">Serviços com prioridade</span><h2>Prestadores <em>Premium.</em></h2><p>Profissionais locais, verificados pela equipa Chimoio Boladas.</p></div><span className="provider-featured-badge"><Sparkles size={14} /> PREMIUM</span></div>
        <div className="provider-featured-grid">
          {premiumProviders.map((item) => <article className="provider-featured-card" key={item.id}>
            <img src={item.fotoUrl} alt={item.titulo} />
            <div className="provider-featured-info"><span className="provider-featured-meta"><BriefcaseBusiness size={13} /> {item.bairro} · Prestador verificado</span><h3>{item.titulo}</h3><p>{item.descricao}</p><div><b>{Number(item.preco).toLocaleString("pt-MZ")} MT <small>desde</small></b><button className="text-action" onClick={() => onOpenStore({ id: item.provider.id, providerId: item.provider.id, ownerId: item.provider.ownerId, nome: item.provider.nome, tipo: "servico", bairro: item.bairro, visitas: 0, avaliacoes: item.provider.avaliacoes ?? [], anuncios: [{ ...item, plano: "premium" }] })}>Ver prestador <ArrowUpRight size={15} /></button></div></div>
          </article>)}
        </div>
      </section>}

      <section className="content-section" id="anuncios">
        <div className="section-heading"><div><span className="eyebrow">Em destaque na cidade</span><h2>Boladas <em>da semana</em></h2></div><span className="section-count">{published.length.toString().padStart(2, "0")} oportunidades</span></div>
        {premium.length > 0 && <AdRail title="Escolhas Premium" badge="PREMIUM" ads={premium} onOpenStore={onOpenStore} onChat={setChatAd} />}
        {highlights.length > 0 && <AdRail title="A não perder" badge="DESTAQUE" ads={highlights} onOpenStore={onOpenStore} onChat={setChatAd} />}
        {regular.length > 0 && <AdRail title="Mais negócios locais" ads={regular} onOpenStore={onOpenStore} onChat={setChatAd} />}
        {published.length === 0 && <div className="empty-state">Ainda não há anúncios publicados. Seja o primeiro negócio a aparecer por aqui.</div>}
      </section>
      {chatAd && <GeminiChatModal ad={chatAd} activeUser={activeUser} onClose={() => setChatAd(null)} />}
    </>
  );
}

function AdRail({ title, badge, ads, onOpenStore, onChat }) {
  return (
    <div className="ad-rail-section">
      <div className="rail-title"><h3>{title}</h3>{badge && <span className={`plan-badge ${badge.toLowerCase()}`}><Sparkles size={12} /> {badge}</span>}</div>
      <div className="ad-grid">
        {ads.map((ad) => (
          <article className="ad-card" key={ad.id}>
            <button className="ad-photo-button" onClick={() => onOpenStore(ad.store)} aria-label={`Ver loja ${ad.store?.nome}`}>
              <img src={ad.fotoUrl} alt={ad.titulo} />
              {ad.plano === "premium" && <span className="image-tag">✦ Escolha local</span>}
            </button>
            <div className="ad-info">
              <div className="ad-card-meta"><span>{ad.store?.bairro ?? "Chimoio"}</span><span>{planLabels[ad.plano]}</span></div>
              <h4>{ad.titulo}</h4>
              <p>{ad.descricao}</p>
              <div className="ad-card-bottom"><b>{Number(ad.preco).toLocaleString("pt-MZ")} MT</b><div>
                <button className="icon-action" title="Perguntar ao assistente" onClick={() => onChat(ad)}><MessageCircle size={17} /></button>
                <button className="text-action" onClick={() => onOpenStore(ad.store)}>Ver loja <ArrowUpRight size={15} /></button>
              </div></div>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
