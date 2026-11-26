import { useEffect } from "react";
import { Link } from "react-router-dom";
import {
  FiArrowUpRight,
  FiCompass,
  FiFileText,
  FiGrid,
  FiLock,
  FiLogIn,
  FiLogOut,
  FiMessageCircle,
  FiPackage,
  FiShield,
  FiShoppingBag,
  FiTool,
  FiUser
} from "react-icons/fi";
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
  <header className="fixed top-0 left-0 right-0 z-50 flex h-[82px] items-center justify-between gap-6 border-b border-[var(--line)] bg-white px-[clamp(20px,6vw,88px)] max-[850px]:gap-3 max-[560px]:grid max-[560px]:h-auto max-[560px]:min-h-0 max-[560px]:grid-cols-[minmax(0,1fr)_auto] max-[560px]:gap-x-2 max-[560px]:gap-y-1.5 max-[560px]:px-3 max-[560px]:py-2" role="banner">
    <Link className="flex min-w-0 items-center gap-3 font-[Manrope,sans-serif] text-[17px] font-extrabold leading-[1.15] max-[560px]:gap-2" to="/">
      <span className="grid h-[42px] w-[42px] flex-none place-items-center rounded-[13px] bg-[var(--yellow)] font-[Manrope,sans-serif] text-xl font-extrabold text-[var(--navy)] max-[560px]:h-9 max-[560px]:w-9">Y</span>
      <span className="min-w-0"><b className="text-[var(--blue)]">YELLOW</b><small className="mt-[5px] block truncate text-[9px] font-bold tracking-[.17em] text-[#83929c] max-[560px]:mt-0.5 max-[560px]:text-[8px] max-[560px]:tracking-[.1em]">NEGÓCIOS LOCAIS · CHIMOIO</small></span>
    </Link>
    <nav className="flex items-center gap-[clamp(12px,2.4vw,30px)] whitespace-nowrap text-[13px] font-semibold text-[#516574] max-[850px]:overflow-x-auto max-[560px]:col-span-2 max-[560px]:row-start-2 max-[560px]:grid max-[560px]:w-full max-[560px]:grid-cols-3 max-[560px]:gap-1 max-[560px]:overflow-visible max-[560px]:whitespace-normal" aria-label="Navegação principal">
      <Link className="inline-flex min-h-10 items-center gap-1.5 rounded-lg px-2 transition-colors hover:bg-[#f3f6f7] hover:text-[var(--blue)] max-[560px]:min-h-9 max-[560px]:flex-col max-[560px]:justify-center max-[560px]:gap-0.5 max-[560px]:px-1 max-[560px]:py-1 max-[560px]:text-[10px] max-[560px]:leading-tight" to="/"><FiCompass aria-hidden="true" size={15} />Explorar</Link>
      <Link className="inline-flex min-h-10 items-center gap-1.5 rounded-lg px-2 transition-colors hover:bg-[#f3f6f7] hover:text-[var(--blue)] max-[560px]:min-h-9 max-[560px]:flex-col max-[560px]:justify-center max-[560px]:gap-0.5 max-[560px]:px-1 max-[560px]:py-1 max-[560px]:text-[10px] max-[560px]:leading-tight" to="/produtos"><FiPackage aria-hidden="true" size={15} />Produtos</Link>
      <Link className="inline-flex min-h-10 items-center gap-1.5 rounded-lg px-2 transition-colors hover:bg-[#f3f6f7] hover:text-[var(--blue)] max-[560px]:min-h-9 max-[560px]:flex-col max-[560px]:justify-center max-[560px]:gap-0.5 max-[560px]:px-1 max-[560px]:py-1 max-[560px]:text-[10px] max-[560px]:leading-tight" to="/servicos"><FiTool aria-hidden="true" size={15} />Serviços</Link>
      <Link className="inline-flex min-h-10 items-center gap-1.5 rounded-lg px-2 transition-colors hover:bg-[#f3f6f7] hover:text-[var(--blue)] max-[560px]:min-h-9 max-[560px]:flex-col max-[560px]:justify-center max-[560px]:gap-0.5 max-[560px]:px-1 max-[560px]:py-1 max-[560px]:text-[10px] max-[560px]:leading-tight" to="/lojas"><FiShoppingBag aria-hidden="true" size={15} />Lojas</Link>
      {profile && profile.role !== "admin" && <Link className="inline-flex min-h-10 items-center gap-1.5 rounded-lg px-2 transition-colors hover:bg-[#f3f6f7] hover:text-[var(--blue)] max-[560px]:min-h-9 max-[560px]:flex-col max-[560px]:justify-center max-[560px]:gap-0.5 max-[560px]:px-1 max-[560px]:py-1 max-[560px]:text-[10px] max-[560px]:leading-tight" to="/mensagens"><span className="inline-flex items-center gap-1"><FiMessageCircle aria-hidden="true" size={15} />{pendingNegotiations > 0 && <span className="rounded-full bg-[var(--yellow)] px-1 py-0.5 text-[9px] font-bold text-[var(--navy)]" aria-label={`${pendingNegotiations} pendentes`}>{pendingNegotiations}</span>}</span>Mensagens</Link>}
      {profile && <Link className="inline-flex min-h-10 items-center gap-1.5 rounded-lg px-2 transition-colors hover:bg-[#f3f6f7] hover:text-[var(--blue)] max-[560px]:min-h-9 max-[560px]:flex-col max-[560px]:justify-center max-[560px]:gap-0.5 max-[560px]:px-1 max-[560px]:py-1 max-[560px]:text-[10px] max-[560px]:leading-tight" to="/painel"><FiGrid aria-hidden="true" size={15} /><span className="max-[560px]:hidden">{dashboardLabels[profile.role]}</span><span className="hidden max-[560px]:inline">{profile.role === "lojista" ? "Minha loja" : profile.role === "client" ? "Negócio" : profile.role === "admin" ? "Admin" : "Painel"}</span></Link>}
    </nav>
    <div className="flex items-center gap-[14px] text-xs text-[var(--muted)] max-[560px]:col-start-2 max-[560px]:row-start-1 max-[560px]:justify-self-end max-[560px]:gap-1">
      {profile ? <>
        <Link
          className="inline-flex min-w-0 items-center gap-2 rounded-full p-1.5 pr-2.5 text-[var(--navy)] transition-colors hover:bg-[#f3f6f7] max-[560px]:p-0.5"
          to="/conta"
          aria-label={`Editar perfil de ${profile.name}`}
          title="Editar perfil"
        >
          {profile.avatarUrl
            ? <img className="h-9 w-9 flex-none rounded-full border border-[var(--line)] bg-[#eaf1f4] object-cover" src={profile.avatarUrl} alt="" />
            : <span className="grid h-9 w-9 flex-none place-items-center rounded-full bg-[#eaf1f4] text-[var(--blue)]" aria-hidden="true">
                {profile.name
                  ? <b className="font-[Manrope,sans-serif] text-sm font-extrabold">{profile.name.trim().slice(0, 1).toLocaleUpperCase()}</b>
                  : <FiUser aria-hidden="true" />}
              </span>}
          <span className="max-w-[150px] truncate font-bold max-[560px]:sr-only">{profile.name}</span>
        </Link>
        <button className="inline-flex min-h-[42px] items-center justify-center gap-[9px] rounded-lg border border-[#c8d6dd] bg-white px-[17px] text-xs font-bold text-[var(--navy)] transition-colors hover:bg-[#f3f6f7] max-[560px]:min-h-9 max-[560px]:gap-1.5 max-[560px]:px-2.5 max-[560px]:text-[11px]" onClick={onSignOut}><FiLogOut aria-hidden="true" />Sair</button>
      </> : <Link className="inline-flex min-h-[42px] items-center justify-center gap-[9px] rounded-lg bg-[var(--navy)] px-[17px] text-xs font-bold text-white transition-colors hover:bg-[var(--blue)] max-[560px]:min-h-9 max-[560px]:gap-1.5 max-[560px]:px-2.5 max-[560px]:text-[11px]" to="/conta"><FiLogIn aria-hidden="true" />Entrar</Link>}
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
    <div className={`sticky top-2 z-[4] mx-auto -mb-[62px] mt-3 flex w-[min(94%,900px)] items-center justify-between gap-[18px] rounded-[10px] border px-4 py-3 text-[13px] shadow-[0_9px_24px_#14334b14] ${notice.error ? "border-[#f3d0c7] bg-[#fff0ec] text-[#9e3b2e]" : "border-[#c8e8d8] bg-[#e5f4ed] text-[#195c48]"}`} role={notice.error ? "alert" : "status"}>
      <span>{notice.text}</span>
      <button className="border-0 bg-transparent text-xl text-inherit" onClick={onDismiss} aria-label="Fechar aviso">×</button>
    </div>
  );
}

export function Hero() {
  return (
    <section className="relative flex min-h-[410px] items-center justify-between overflow-hidden bg-[radial-gradient(circle_at_75%_52%,#75600d_0,transparent_26%),linear-gradient(110deg,#292719,#49401f_68%,#5d4b0d)] px-[clamp(24px,10vw,140px)] py-16 text-white after:absolute after:right-[5%] after:top-[-34%] after:h-[480px] after:w-[480px] after:rounded-full after:border after:border-[#ffffff20] after:shadow-[0_0_0_48px_#ffffff08,0_0_0_105px_#ffffff06] after:content-[''] max-[700px]:flex-col max-[700px]:items-start" id="inicio">
      <div>
        <p className="text-[10px] font-extrabold tracking-[.17em] text-[#ffe58a]">MERCADO HIPERLOCAL · CHIMOIO</p>
        <h1 className="my-[13px] mt-[19px] font-[Manrope,sans-serif] text-[clamp(38px,5vw,62px)] font-extrabold leading-[1.08] tracking-[-.05em]">Encontre perto.<br /><em className="not-italic text-[var(--yellow)]">Negocie directo.</em></h1>
        <p className="max-w-[430px] text-sm leading-[1.7] text-[#d1e4f0]">Marketplace gratuito e aberto para descobrir negócios locais, publicar serviços e negociar directamente.</p>
        <a className="mt-[15px] inline-flex min-h-[42px] items-center justify-center gap-[9px] rounded-lg bg-white px-[17px] text-xs font-bold text-[var(--navy)]" href="#mercado">Explorar ofertas <FiArrowUpRight aria-hidden="true" /></a>
      </div>
      <div className="relative z-[1] mr-[4vw] grid h-[180px] w-[180px] rotate-[-12deg] content-center place-items-center rounded-full border border-[#ffffff65] text-[#d9eafa] max-[700px]:self-center before:absolute before:inset-3 before:rounded-full before:border before:border-dashed before:border-[#ffffff70]">
        <span className="text-[9px] tracking-[.17em]">19°07′ S</span><b className="my-2 font-[Manrope,sans-serif] text-[21px] font-extrabold tracking-[.1em] text-white">CHIMOIO</b><span className="text-[9px] tracking-[.17em]">33°29′ E</span>
      </div>
    </section>
  );
}

export function VisitorGuide() {
  return (
    <aside className="flex items-center gap-5 border-b border-[#f0e2a8] bg-[var(--yellow-soft)] px-[clamp(20px,7vw,100px)] py-[18px] text-[var(--navy)] max-[700px]:flex-col max-[700px]:items-start" aria-label="Como usar a YELLOW">
      <strong className="flex-none font-[Manrope,sans-serif] text-sm font-extrabold">Como usar</strong>
      <ol className="m-0 flex flex-wrap gap-x-6 gap-y-[10px] pl-5 text-xs text-[#536978]">
        <li>Escolhe uma categoria ou pesquisa o que procuras.</li>
        <li>Abre um produto, serviço ou loja para ver os detalhes.</li>
        <li>Entra na tua conta para conversar ou negociar.</li>
      </ol>
    </aside>
  );
}



export function SiteFooter() {
  const scrollToTop = () => window.scrollTo({ top: 0, behavior: "smooth" });

  return (
    <footer className="mt-16 border-t border-[var(--line)] bg-white px-[clamp(20px,6vw,88px)] py-12 text-[#516574]" role="contentinfo">
      <div className="mx-auto grid max-w-[1200px] grid-cols-1 gap-8 md:grid-cols-4">
        {/* Coluna 1: Marca e Missão */}
        <div className="md:col-span-2">
          <Link className="inline-flex items-center gap-2.5 font-[Manrope,sans-serif] text-base font-extrabold" to="/" onClick={scrollToTop}>
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-[var(--yellow)] text-sm font-extrabold text-[var(--navy)]">Y</span>
            <span className="text-[var(--blue)]">YELLOW</span>
          </Link>
          <p className="mt-3 max-w-sm text-xs leading-relaxed text-[#64748b]">
            Marketplace hiperlocal gratuito para descobrir lojas, produtos e prestadores de serviços em Chimoio. Negocie diretamente com comerciantes e profissionais da sua zona.
          </p>
          <p className="mt-3 text-[11px] font-semibold text-[var(--navy)]">
            Todos os valores apresentados em Meticais (MT).
          </p>
        </div>

        {/* Coluna 2: Explorar */}
        <div>
          <h3 className="text-xs font-extrabold uppercase tracking-wider text-[var(--navy)]">Plataforma</h3>
          <ul className="mt-3 space-y-2 text-xs">
            <li><Link className="hover:text-[var(--blue)]" to="/" onClick={scrollToTop}>Explorar ofertas</Link></li>
            <li><Link className="hover:text-[var(--blue)]" to="/produtos" onClick={scrollToTop}>Produtos</Link></li>
            <li><Link className="hover:text-[var(--blue)]" to="/servicos" onClick={scrollToTop}>Serviços</Link></li>
            <li><Link className="hover:text-[var(--blue)]" to="/lojas" onClick={scrollToTop}>Lojas locais</Link></li>
            <li><Link className="hover:text-[var(--blue)]" to="/conta" onClick={scrollToTop}>Abrir negócio / Entrar</Link></li>
          </ul>
        </div>

        {/* Coluna 3: Segurança e Suporte */}
        <div>
          <h3 className="text-xs font-extrabold uppercase tracking-wider text-[var(--navy)]">Informação & Ajuda</h3>
          <ul className="mt-3 space-y-2 text-xs">
            <li>
              <Link className="inline-flex items-center gap-2 hover:text-[var(--blue)]" to="/seguranca" onClick={scrollToTop}>
                <FiShield aria-hidden="true" className="text-sm" /> Dicas de segurança <FiArrowUpRight aria-hidden="true" className="text-[11px] opacity-60" />
              </Link>
            </li>
            <li>
              <Link className="inline-flex items-center gap-2 hover:text-[var(--blue)]" to="/privacidade" onClick={scrollToTop}>
                <FiLock aria-hidden="true" className="text-sm" /> Privacidade e Dados <FiArrowUpRight aria-hidden="true" className="text-[11px] opacity-60" />
              </Link>
            </li>
            <li>
              <Link className="inline-flex items-center gap-2 hover:text-[var(--blue)]" to="/termos" onClick={scrollToTop}>
                <FiFileText aria-hidden="true" className="text-sm" /> Termos de utilização <FiArrowUpRight aria-hidden="true" className="text-[11px] opacity-60" />
              </Link>
            </li>
            <li className="pt-1 text-[11px] text-[#83929c]">Chimoio, Manica · Moçambique</li>
          </ul>
        </div>
      </div>

      {/* Barra inferior */}
      <div className="mx-auto mt-10 flex max-w-[1200px] flex-col items-center justify-between gap-3 border-t border-[var(--line)] pt-6 text-[11px] text-[#83929c] sm:flex-row">
        <span>© {new Date().getFullYear()} YELLOW · Negócios Locais Chimoio.</span>
        <span>A YELLOW facilita o contacto direto; verifique sempre os artigos antes de efetuar pagamentos.</span>
      </div>
    </footer>
  );
}