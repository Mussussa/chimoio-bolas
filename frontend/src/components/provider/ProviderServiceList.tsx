import type { ProviderService } from "../../lib/api";
import CategoryImage from "../marketplace/CategoryImage";
import { FALLBACK_IMAGE, SERVICE_CATEGORY_IMAGES } from "../../lib/categoryPlaceholders";

type ProviderServiceListProps = Readonly<{
  services: ProviderService[];
  saving: boolean;
  onEdit: (service: ProviderService) => void;
  onDelete: (service: ProviderService) => void;
}>;

export default function ProviderServiceList({ services, saving, onEdit, onDelete }: ProviderServiceListProps) {
  if (services.length === 0) return <p className="py-3 text-xs leading-[1.6] text-[var(--muted)]">Ainda não publicou serviços. O primeiro anúncio ficará visível no catálogo após a publicação.</p>;

  return (
    <div className="mt-4 grid gap-3">
      {services.map((service) => (
        <article className="grid grid-cols-1 overflow-hidden rounded-[7px] border border-[var(--line)] bg-white min-[851px]:grid-cols-[minmax(100px,.7fr)_minmax(0,1fr)]">
          <div className="grid max-h-none auto-rows-auto grid-cols-3 content-start gap-2 overflow-hidden bg-[#eef2f4]">
            {service.images?.length > 0
              ? service.images.map((image, index) => <CategoryImage className="aspect-[4/3] h-full w-full object-cover" src={image} alt={`${service.title}, imagem ${index + 1}`} key={image} />)
              : <CategoryImage className="aspect-[4/3] h-full w-full object-cover" placeholder={SERVICE_CATEGORY_IMAGES[service.category] ?? FALLBACK_IMAGE} alt={service.title} />}
          </div>
          <div className="min-w-0 p-[15px]">
            <span className="inline-flex rounded-[5px] bg-[#e9f4ef] px-2 py-1.5 text-[9px] font-extrabold tracking-[.08em] text-[#2b745e]">{service.category}</span>
            <h3 className="my-[7px] mt-[10px] font-[Manrope,sans-serif] text-[15px] font-bold text-[var(--navy)]">{service.title}</h3>
            <p className="text-xs leading-[1.55] text-[var(--muted)]">{service.description}</p>
            <div className="flex items-center justify-between gap-3 text-[11px] text-[#758590]"><b className="whitespace-nowrap text-[15px] text-[var(--navy)]">{Number(service.price).toLocaleString("pt-MZ")} MT</b><span>{service.deliveryTime}</span></div>
            <div className="mt-[14px] flex gap-2">
              <button type="button" className="inline-flex min-h-[36px] items-center justify-center gap-[9px] rounded-lg border border-[#c8d6dd] bg-white px-3 text-xs font-bold text-[var(--navy)]" onClick={() => onEdit(service)}>Editar</button>
              <button type="button" className="inline-flex min-h-[36px] items-center justify-center gap-[9px] rounded-lg border border-[#f0cfc8] bg-[#fff7f5] px-3 text-xs font-bold text-[#9e3b2e] disabled:cursor-wait disabled:opacity-[.56]" disabled={saving} onClick={() => onDelete(service)}>Remover</button>
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}