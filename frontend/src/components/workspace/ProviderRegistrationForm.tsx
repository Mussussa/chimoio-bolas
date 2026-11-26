import { useState, type FormEvent } from "react";
import { FiBriefcase, FiCheckCircle, FiDollarSign, FiMapPin, FiTool } from "react-icons/fi";
import type { ProviderForm } from "../../lib/types";
import { CHIMOIO_NEIGHBORHOODS } from "../../lib/chimoioNeighborhoods";
import { PROVIDER_CATEGORIES } from "../provider/providerTypes";
import WorkspaceCard, { workspaceButtonClass, workspaceFieldClass, workspaceInputClass } from "./WorkspaceCard";

type ProviderRegistrationFormProps = Readonly<{
  busy: boolean;
  onRegisterProvider: (event: FormEvent<HTMLFormElement>, provider: ProviderForm) => Promise<boolean>;
}>;

const initialProviderForm: ProviderForm = { category: [], bio: "", basePrice: "", neighborhood: "" };

export default function ProviderRegistrationForm({ busy, onRegisterProvider }: ProviderRegistrationFormProps) {
  const [providerForm, setProviderForm] = useState(initialProviderForm);

  function toggleProviderCategory(category: string) {
    setProviderForm((current) => ({
      ...current,
      category: current.category.includes(category)
        ? current.category.filter((item) => item !== category)
        : [...current.category, category]
    }));
  }

  return (
    <WorkspaceCard
      eyebrow="OFERECER SERVIÇOS"
      title="Criar perfil de prestador"
      description="Indique as suas especialidades e zona de atendimento para que clientes o encontrem."
      icon={FiBriefcase}
    >
      <form className="grid grid-cols-1 gap-4 min-[851px]:grid-cols-2" onSubmit={(event) => void onRegisterProvider(event, providerForm)}>
        <label className={`${workspaceFieldClass} min-[851px]:col-span-2`}>
          <span className="inline-flex items-center gap-1.5"><FiMapPin aria-hidden="true" /> Bairro onde presta serviços</span>
          <select className={workspaceInputClass} required value={providerForm.neighborhood} onChange={(event) => setProviderForm((current) => ({ ...current, neighborhood: event.target.value }))}>
            <option value="">Escolha o bairro</option>
            {CHIMOIO_NEIGHBORHOODS.map((neighborhood) => <option key={neighborhood.name} value={neighborhood.name}>{neighborhood.name}</option>)}
          </select>
          <small className="font-normal text-[var(--muted)]">O mapa usa o centro aproximado do bairro para localizar os seus serviços.</small>
        </label>

        <fieldset className="m-0 grid gap-2 border-0 p-0 min-[851px]:col-span-2">
          <legend className="mb-2 inline-flex items-center gap-1.5 text-xs font-bold text-[#506472]"><FiTool aria-hidden="true" /> Especialidades (pode escolher várias)</legend>
          <div className="grid grid-cols-1 gap-2 min-[561px]:grid-cols-2">
            {PROVIDER_CATEGORIES.map((category) => (
              <label className="flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border border-[var(--line)] px-3 py-2 text-xs text-[#506472] transition hover:bg-[#f8fafb]" key={category}>
                <input className="h-4 w-4 accent-[var(--navy)]" type="checkbox" checked={providerForm.category.includes(category)} onChange={() => toggleProviderCategory(category)} />
                {category}
              </label>
            ))}
          </div>
        </fieldset>

        <label className={`${workspaceFieldClass} min-[851px]:col-span-2`}>
          <span className="inline-flex items-center gap-1.5"><FiDollarSign aria-hidden="true" /> Preço inicial ou taxa de visita (MT)</span>
          <input className={workspaceInputClass} required type="number" min="0" step="0.01" placeholder="Ex.: 500.00" value={providerForm.basePrice} onChange={(event) => setProviderForm((current) => ({ ...current, basePrice: event.target.value }))} />
        </label>

        <label className={`${workspaceFieldClass} min-[851px]:col-span-2`}>
          Sobre si e a sua experiência
          <textarea className={`${workspaceInputClass} min-h-32 resize-y`} required maxLength={2000} placeholder="Fale sobre o seu trabalho, experiência e zonas de atendimento." value={providerForm.bio} onChange={(event) => setProviderForm((current) => ({ ...current, bio: event.target.value }))} />
        </label>

        <button className={`${workspaceButtonClass} min-[851px]:col-span-2`} type="submit" disabled={busy}>
          <FiCheckCircle aria-hidden="true" /> {busy ? "A criar perfil..." : "Criar perfil de prestador"}
        </button>
      </form>
    </WorkspaceCard>
  );
}
