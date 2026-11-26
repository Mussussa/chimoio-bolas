import { useEffect, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { loadPublicProvider, type PublicProviderDetail, type ReviewPayload } from "../lib/api";
import { providerServiceHref } from "../lib/publicLinks";
import type { Profile } from "../lib/types";
import ReviewForm from "../components/marketplace/ReviewForm";
import ReviewSection from "../components/marketplace/ReviewSection";
import SharePageButton from "../components/marketplace/SharePageButton";
import CategoryImage from "../components/marketplace/CategoryImage";
import { FALLBACK_IMAGE, SERVICE_CATEGORY_IMAGES } from "../lib/categoryPlaceholders";

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

  if (error) return <section className="px-[clamp(20px,7vw,100px)] py-[70px] max-[560px]:py-12"><p className="col-span-full rounded-[10px] border border-dashed border-[#cbd8de] p-6 text-center text-[13px] text-[#716e60]">{error} <Link className="font-bold text-[#765900] underline" to="/">Voltar ao catálogo</Link></p></section>;
  if (!detail) return <section className="px-[clamp(20px,7vw,100px)] py-[70px] max-[560px]:py-12"><p className="col-span-full rounded-[10px] border border-dashed border-[#cbd8de] p-6 text-center text-[13px] text-[#716e60]">A carregar perfil do prestador...</p></section>;
  const { provider, profile: providerProfile, services, reviews } = detail;

  return (
    <article className="min-h-[65vh] px-[clamp(20px,7vw,100px)] py-[70px] max-[560px]:py-12">
      <Link to="/" className="mb-5 inline-block text-[13px] font-bold text-[#765900]">← Voltar a explorar</Link>
      <header className="my-2 flex flex-col items-start gap-[22px] min-[561px]:flex-row min-[561px]:items-center">
        {providerProfile?.avatarUrl && <img className="h-[100px] w-[100px] rounded-full bg-[#eaf1f4] object-cover" src={providerProfile.avatarUrl} alt="" />}
        <div>
          <span className={`inline-flex rounded-[5px] px-2 py-1.5 text-[9px] font-extrabold tracking-[.08em] ${provider.verified ? "bg-[#e9f4ef] text-[#2b745e]" : "bg-[#fff7d6] text-[#765900]"}`}>{provider.verified ? "Prestador verificado ✓" : "Prestador não verificado"}</span>
          <h1 className="my-3 text-[clamp(28px,4vw,42px)] font-extrabold leading-tight tracking-[-.04em]">{providerProfile?.name ?? "Prestador de serviços"}</h1>
          <p className="text-[#716e60]">{provider.category.join(" · ")}</p>
        </div>
      </header>
      <p className="max-w-[760px] leading-[1.75] text-[#536978]">{provider.bio}</p>
      <p>Preço base: <b>{Number(provider.basePrice).toLocaleString("pt-MZ")} MT</b></p>
      <section className="mt-10">
        <h2 className="font-[Manrope,sans-serif] text-2xl font-extrabold">Serviços publicados <span className="ml-1.5 inline-grid h-6 min-w-6 place-items-center rounded-full bg-[#fff7d6] align-middle text-[12px] font-bold text-[#765900]">{services.length}</span></h2>
        {services.length ? (
          <div className="grid grid-cols-1 gap-[15px] min-[561px]:grid-cols-2 min-[851px]:grid-cols-3">
            {services.map((service) => (
              <article className="min-h-[206px] rounded-xl border border-[#e7e1ca] border-t-[3px] border-t-[#74ae8f] bg-white p-[22px] shadow-[0_8px_18px_#16354a08]" id={`servico-${service.id}`} key={service.id} tabIndex={-1}>
                <CategoryImage className="my-3 block aspect-video w-full rounded-md bg-[#eef2f4] object-cover" src={service.images?.[0]} placeholder={SERVICE_CATEGORY_IMAGES[service.category] ?? FALLBACK_IMAGE} alt={service.title} />
                <h3 className="my-[13px] mb-2 font-[Manrope,sans-serif] text-[17px] font-bold">{service.title}</h3>
                <p className="text-[13px] leading-[1.6] text-[#716e60]">{service.description}</p>
                <div className="flex items-center justify-between gap-3 text-[11px] text-[#758590]"><b className="whitespace-nowrap text-[15px] text-[#302b18]">{Number(service.price).toLocaleString("pt-MZ")} MT</b><span>{service.deliveryTime}</span></div>
                <SharePageButton
                  title={service.title}
                  text={`Conhece o serviço ${service.title} na YELLOW, em Chimoio.`}
                  label="Partilhar serviço"
                  url={`${window.location.origin}${providerServiceHref(provider.id, service.id)}`}
                  imageUrl={service.images?.[0]}
                />
                {profile?.role === "client" && (
                  <button className="mt-[15px] inline-flex min-h-[42px] w-full items-center justify-center gap-[9px] rounded-lg border-0 bg-[#302b18] px-[17px] text-[12px] font-bold text-white transition-[transform,background-color] duration-[160ms] hover:-translate-y-px hover:bg-[#ffd21a] hover:text-[#302b18] disabled:cursor-wait disabled:opacity-[.56]" disabled={busy} onClick={() => onStartNegotiation(service.id)}>
                    Ir para o chat sobre este serviço
                  </button>
                )}
              </article>
            ))}
          </div>
        ) : <p className="col-span-full rounded-[10px] border border-dashed border-[#cbd8de] p-6 text-center text-[13px] text-[#716e60]">Este prestador ainda não publicou serviços.</p>}
      </section>
      <ReviewSection reviews={reviews} />
      {profile?.role === "client" && <ReviewForm targetType="service_provider" targetId={provider.id} targetName={providerProfile?.name ?? "prestador"} busy={busy} onSubmit={onReview} />}
    </article>
  );
}
