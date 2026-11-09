import { useEffect } from "react";
import type { Notice, Profile } from "../lib/types";

type HeaderProps = { profile: Profile | null; onSignOut: () => void };

export function SiteHeader({ profile, onSignOut }: HeaderProps) {
  return (
    <header className="topbar">
      <a className="brand" href="#inicio"><span className="brand-icon">CB</span><span>Chimoio <b>Boladas</b><small>NEGÓCIOS LOCAIS</small></span></a>
      <nav><a href="#mercado">Explorar</a><a href="#servicos">Serviços</a><a href="#negociacoes">Negociações</a></nav>
      <div className="account">{profile ? <><span>{profile.name} · {profile.role}</span><button className="button button-outline" onClick={onSignOut}>Sair</button></> : <a className="button button-dark" href="#conta">Entrar</a>}</div>
    </header>
  );
}

export function NoticeBanner({ notice, onDismiss }: { notice: Notice; onDismiss: () => void }) {
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
    <div className={`notice ${notice.error ? "notice-error" : ""}`} role="status">
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

export function SiteFooter() {
  return (
    <footer><span>CHIMOIO BOLADAS</span><span>Marketplace local gratuito · preços de produtos e serviços em MT</span></footer>
  );
}