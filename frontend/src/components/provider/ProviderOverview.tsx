import type { ProviderDashboardData } from "../../lib/api";
import { FiEdit2, FiTool } from "react-icons/fi";

type ProviderOverviewProps = Readonly<{
  dashboard: ProviderDashboardData;
  onEditProfile: () => void;
  onManageServices: () => void;
}>;

export default function ProviderOverview({ dashboard, onEditProfile, onManageServices }: ProviderOverviewProps) {
  const { provider, profile, services } = dashboard;

  return (
    <div>
      <div className="mb-4 grid grid-cols-1 gap-3 min-[851px]:grid-cols-3">
        <article className="grid gap-[10px] rounded-lg border border-[var(--line)] bg-white px-5 py-[18px]"><span className="text-xs text-[var(--muted)]">Serviços publicados</span><strong className="font-[Manrope,sans-serif] text-2xl font-bold text-[var(--navy)]">{services.length}</strong></article>
        <article className="grid gap-[10px] rounded-lg border border-[var(--line)] bg-white px-5 py-[18px]"><span className="text-xs text-[var(--muted)]">Áreas de atuação</span><strong className="font-[Manrope,sans-serif] text-2xl font-bold text-[var(--navy)]">{provider.category.length}</strong></article>
        <article className="grid gap-[10px] rounded-lg border border-[var(--line)] bg-white px-5 py-[18px]"><span className="text-xs text-[var(--muted)]">Estado do perfil</span><strong className="font-[Manrope,sans-serif] text-2xl font-bold text-[var(--navy)]">{provider.verified ? "Verificado" : "Não verificado"}</strong></article>
      </div>
      <div className="grid grid-cols-1 gap-4 min-[851px]:grid-cols-2">
        <section className="min-w-0 rounded-lg border border-[var(--line)] bg-white p-[17px]">
          <header className="mb-4 flex items-center justify-between gap-[14px]">
            <h2 className="m-0 font-[Manrope,sans-serif] text-lg font-bold text-[var(--navy)]">Perfil profissional</h2>
            <button type="button" className="inline-flex items-center gap-1.5 border-0 bg-transparent font-bold text-[var(--blue)]" onClick={onEditProfile}><FiEdit2 aria-hidden="true" />Editar perfil</button>
          </header>
          <div className="my-3 mb-4 flex items-center gap-[14px]">
            {profile.avatarUrl
              ? <img className="h-[82px] w-[82px] flex-none rounded-full border border-[var(--line)] bg-[#eef4f2] object-cover" src={profile.avatarUrl} alt={`Fotografia de ${profile.name}`} />
              : <span className="grid h-[82px] w-[82px] flex-none place-items-center rounded-full bg-[var(--green)] font-[Manrope,sans-serif] text-[26px] font-bold text-white" aria-hidden="true">{profile.name.slice(0, 1).toLocaleUpperCase() || "P"}</span>}
            <div><h3 className="mb-[5px] font-[Manrope,sans-serif] text-base font-bold text-[var(--navy)]">{profile.name}</h3><span className="text-xs text-[var(--muted)]">Preço-base: {Number(provider.basePrice).toLocaleString("pt-MZ")} MT</span></div>
          </div>
          <p className="text-xs leading-[1.6] text-[var(--muted)]">{provider.bio}</p>
          <div className="flex flex-wrap gap-1.5">{provider.category.map((category) => <span className="inline-flex rounded-[5px] bg-[#e9f4ef] px-2 py-1.5 text-[9px] font-extrabold tracking-[.08em] text-[#2b745e]" key={category}>{category}</span>)}</div>
        </section>
        <section className="min-w-0 rounded-lg border border-[var(--line)] bg-white p-[17px]">
          <header className="mb-4 flex items-center justify-between gap-[14px]">
            <h2 className="m-0 font-[Manrope,sans-serif] text-lg font-bold text-[var(--navy)]">Últimos serviços</h2>
            <button type="button" className="inline-flex items-center gap-1.5 border-0 bg-transparent font-bold text-[var(--blue)]" onClick={onManageServices}><FiTool aria-hidden="true" />Gerir serviços</button>
          </header>
          {services.length === 0 ? <p className="py-3 text-xs leading-[1.6] text-[var(--muted)]">Ainda não tem serviços publicados.</p> : services.slice(0, 4).map((service) => (
            <div className="flex justify-between gap-3 border-b border-[#edf1f3] py-3 text-xs text-[var(--navy)]" key={service.id}>
              <span className="grid gap-1">{service.title}<small className="text-[10px] text-[var(--muted)]">{service.category}</small></span>
              <strong className="whitespace-nowrap">{Number(service.price).toLocaleString("pt-MZ")} MT</strong>
            </div>
          ))}
        </section>
      </div>
    </div>
  );
}