import { useEffect } from "react";
import { Link } from "react-router-dom";
import type { Notice, Profile } from "../../lib/types";

type HeaderProps = Readonly<{
  profile: Profile | null;
  pendingNegotiations: number;
  onSignOut: () => void;
}>;

export function SiteHeader({ profile, pendingNegotiations, onSignOut }: HeaderProps) {
  const dashboardLabels: Record<Profile["role"], string> = {
    client: "Abrir negócio",
    lojista: "Minha Loja",
    prestador: "Painel do Prestador",
    admin: "Administração"
  };
  return (
    <header className="topbar">
      <Link className="brand" to="/"><span className="brand-icon">CB</span><span>Chimoio <b>Boladas</b><small>NEGÓCIOS LOCAIS</small></span></Link>
      <nav aria-label="Navegação principal">
        <Link to="/">Explorar</Link>
        {profile && profile.role !== "admin" && <Link to="/mensagens">Mensagens{pendingNegotiations > 0 && <span className="nav-badge" aria-label={`${pendingNegotiations} pendentes`}>{pendingNegotiations}</span>}</Link>}
        {profile && <Link to="/painel">{dashboardLabels[profile.role]}</Link>}
      </nav>
      <div className="account">
        {profile ? <><Link to="/conta">{profile.name}</Link><button className="button button-outline" onClick={onSignOut}>Sair</button></> : <Link className="button button-dark" to="/conta">Entrar</Link>}
      </div>
    </header>
  );
}

export function NoticeBanner({ notice, onDismiss }: Readonly<{ notice: Notice; onDismiss: () => void }>) {
  // Temporizador para fechar a notificação automaticamente após 4 segundos
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => {
      onDismiss();
    }, 4000);
    return () => clearTimeout(timer);
  }, [notice, onDismiss]);

  if (!notice) return null;

  return (
    <div className={`notice ${notice.error ? "notice-error" : ""}`} role={notice.error ? "alert" : "status"}>
      <span>{notice.text}</span>
      <button onClick={onDismiss} aria-label="Fechar aviso">×</button>
    </div>
  );
}

export function Hero() {
  return (
    <section className="hero" id="inicio">
      <div>
        <p className="eyebrow">MERCADO HIPERLOCAL · CHIMOIO</p>
        <h1>Encontre perto.<br /><em>Negocie directo.</em></h1>
        <p className="hero-copy">Marketplace gratuito e aberto para descobrir negócios locais, publicar serviços e negociar directamente.</p>
        <a className="button button-light" href="#mercado">Explorar ofertas <span>↗</span></a>
      </div>
      <div className="hero-stamp"><span>19°07′ S</span><b>CHIMOIO</b><span>33°29′ E</span></div>
    </section>
  );
}

export function VisitorGuide() {
  return (
    <aside className="visitor-guide" aria-label="Como usar o Chimoio Boladas">
      <strong>Como usar</strong>
      <ol>
        <li>Escolhe uma categoria ou pesquisa o que procuras.</li>
        <li>Abre um produto, serviço ou loja para ver os detalhes.</li>
        <li>Entra na tua conta para conversar ou negociar.</li>
      </ol>
    </aside>
  );
}

export function SiteFooter() {
  return (
    <footer><span>CHIMOIO BOLADAS</span><span>Marketplace local gratuito · preços de produtos e serviços em MT</span></footer>
  );
}