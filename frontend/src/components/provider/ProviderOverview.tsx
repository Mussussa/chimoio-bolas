import type { ProviderDashboardData } from "../../lib/api";

type ProviderOverviewProps = Readonly<{
  dashboard: ProviderDashboardData;
  onEditProfile: () => void;
  onManageServices: () => void;
}>;

export default function ProviderOverview({ dashboard, onEditProfile, onManageServices }: ProviderOverviewProps) {
  const { provider, profile, services } = dashboard;

  return (
    <div className="provider-overview">
      <div className="provider-stats">
        <article><span>Serviços publicados</span><strong>{services.length}</strong></article>
        <article><span>Áreas de atuação</span><strong>{provider.category.length}</strong></article>
        <article><span>Estado do perfil</span><strong>{provider.verified ? "Verificado" : "Não verificado"}</strong></article>
      </div>
      <div className="provider-overview-grid">
        <section className="provider-panel">
          <header className="provider-panel-heading">
            <h2>Perfil profissional</h2>
            <button type="button" className="link-button" onClick={onEditProfile}>Editar perfil</button>
          </header>
          <div className="provider-overview-identity">
            {profile.avatarUrl
              ? <img className="provider-avatar" src={profile.avatarUrl} alt={`Fotografia de ${profile.name}`} />
              : <span className="provider-avatar provider-avatar-placeholder" aria-hidden="true">{profile.name.slice(0, 1).toLocaleUpperCase() || "P"}</span>}
            <div><h3>{profile.name}</h3><span>Preço-base: {Number(provider.basePrice).toLocaleString("pt-MZ")} MT</span></div>
          </div>
          <p>{provider.bio}</p>
          <div className="provider-category-tags">{provider.category.map((category) => <span className="tag tag-green" key={category}>{category}</span>)}</div>
        </section>
        <section className="provider-panel">
          <header className="provider-panel-heading">
            <h2>Últimos serviços</h2>
            <button type="button" className="link-button" onClick={onManageServices}>Gerir serviços</button>
          </header>
          {services.length === 0 ? <p className="provider-empty">Ainda não tem serviços publicados.</p> : services.slice(0, 4).map((service) => (
            <div className="provider-recent-service" key={service.id}>
              <span>{service.title}<small>{service.category}</small></span>
              <strong>{Number(service.price).toLocaleString("pt-MZ")} MT</strong>
            </div>
          ))}
        </section>
      </div>
    </div>
  );
}