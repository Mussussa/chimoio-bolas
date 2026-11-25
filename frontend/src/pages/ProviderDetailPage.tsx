import { useEffect, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { loadPublicProvider, type PublicProviderDetail, type ReviewPayload } from "../lib/api";
import { providerServiceHref } from "../lib/publicLinks";
import type { Profile } from "../lib/types";
import ReviewForm from "../components/marketplace/ReviewForm";
import ReviewSection from "../components/marketplace/ReviewSection";
import SharePageButton from "../components/marketplace/SharePageButton";

type ProviderDetailPageProps = Readonly<{
  profile: Profile | null;
  busy: boolean;
  onReview: (review: ReviewPayload) => Promise<boolean>;
  onStartNegotiation: (serviceId: string) => void;
}>;

export default function ProviderDetailPage({
  profile, busy, onReview, onStartNegotiation
}: ProviderDetailPageProps) {
  const { providerId = "" } = useParams();
  const location = useLocation();
  const [detail, setDetail] = useState<PublicProviderDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setDetail(null);
    setError(null);
    void loadPublicProvider(providerId)
      .then((result) => { if (active) setDetail(result); })
      .catch((loadError: Error) => { if (active) setError(loadError.message); });
    return () => { active = false; };
  }, [providerId]);

  useEffect(() => {
    if (!detail || !location.hash.startsWith("#servico-")) return;
    const serviceCard = document.getElementById(decodeURIComponent(location.hash.slice(1)));
    serviceCard?.scrollIntoView({ behavior: "smooth", block: "center" });
    serviceCard?.focus({ preventScroll: true });
  }, [detail, location.hash]);

  if (error) return <section className="section"><p className="empty">{error} <Link to="/">Voltar ao catálogo</Link></p></section>;
  if (!detail) return <section className="section"><p className="empty">A carregar perfil do prestador...</p></section>;
  const { provider, profile: providerProfile, services, reviews } = detail;

  return (
    <article className="section public-detail">
      <Link to="/" className="detail-back">← Voltar a explorar</Link>
      <header className="public-detail-heading">
        {providerProfile?.avatarUrl && <img className="provider-detail-avatar" src={providerProfile.avatarUrl} alt="" />}
        <div>
          <span className="tag tag-green">{provider.verified ? "Prestador verificado ✓" : "Prestador na plataforma"}</span>
          <h1>{providerProfile?.name ?? "Prestador de serviços"}</h1>
          <p>{provider.category.join(" · ")}</p>
        </div>
      </header>
      <p className="public-detail-copy">{provider.bio}</p>
      <p>Preço base: <b>{Number(provider.basePrice).toLocaleString("pt-MZ")} MT</b></p>
      <section className="detail-section">
        <h2>Serviços publicados <span className="detail-count">{services.length}</span></h2>
        {services.length ? (
          <div className="catalog-grid">
            {services.map((service) => (
              <article className="listing-card service-card" id={`servico-${service.id}`} key={service.id} tabIndex={-1}>
                {service.images?.[0] && <img className="service-listing-image" src={service.images[0]} alt={service.title} />}
                <h3>{service.title}</h3>
                <p>{service.description}</p>
                <div className="listing-foot"><b>{Number(service.price).toLocaleString("pt-MZ")} MT</b><span>{service.deliveryTime}</span></div>
                <SharePageButton
                  title={service.title}
                  text={`Conhece o serviço ${service.title} em Chimoio Boladas.`}
                  label="Partilhar serviço"
                  url={`${window.location.origin}${providerServiceHref(provider.id, service.id)}`}
                  imageUrl={service.images?.[0]}
                />
                {profile?.role === "client" && (
                  <button className="button button-dark full-button" disabled={busy} onClick={() => onStartNegotiation(service.id)}>
                    Ir para o chat sobre este serviço
                  </button>
                )}
              </article>
            ))}
          </div>
        ) : <p className="empty">Este prestador ainda não publicou serviços.</p>}
      </section>
      <ReviewSection reviews={reviews} />
      {profile?.role === "client" && <ReviewForm targetType="service_provider" targetId={provider.id} targetName={providerProfile?.name ?? "prestador"} busy={busy} onSubmit={onReview} />}
    </article>
  );
}
