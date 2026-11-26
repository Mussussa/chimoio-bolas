import type { FormEvent } from "react";
import { FiBriefcase, FiPackage } from "react-icons/fi";
import type { Session } from "@supabase/supabase-js";
import type { ProductForm, Profile, ProviderForm, StoreForm } from "../../lib/types";
import ProductCreationForm from "./ProductCreationForm";
import ProviderRegistrationForm from "./ProviderRegistrationForm";
import StoreRegistrationForm from "./StoreRegistrationForm";

type WorkspaceProps = Readonly<{
  session: Session;
  profile: Profile;
  busy: boolean;
  onRegisterStore: (event: FormEvent<HTMLFormElement>, store: StoreForm & { neighborhood?: string }) => Promise<boolean>;
  onCreateProduct: (event: FormEvent<HTMLFormElement>, product: ProductForm & { images?: string[] }) => Promise<boolean>;
  onRegisterProvider: (event: FormEvent<HTMLFormElement>, provider: ProviderForm) => Promise<boolean>;
}>;

export default function Workspace({
  session,
  profile,
  busy,
  onRegisterStore,
  onCreateProduct,
  onRegisterProvider
}: WorkspaceProps) {
  return (
    <section className="grid gap-5 px-4 py-6 min-[561px]:gap-6 min-[561px]:px-[clamp(20px,7vw,100px)] min-[561px]:py-12">
      <header className="flex items-start gap-3 rounded-xl border border-[#e7e1ca] bg-[#fffdf5] p-4 min-[561px]:items-center min-[561px]:gap-4 min-[561px]:p-5">
        <span className="grid h-11 w-11 flex-none place-items-center rounded-xl bg-[var(--yellow-soft)] text-[var(--navy)]" aria-hidden="true">
          {profile.role === "lojista" ? <FiPackage size={21} /> : <FiBriefcase size={21} />}
        </span>
        <div>
          <h1 className="m-0 font-[Manrope,sans-serif] text-lg font-extrabold text-[var(--navy)]">
            {profile.role === "lojista" ? "Divulgue os produtos da sua loja" : "Comece a divulgar o seu negócio"}
          </h1>
          <p className="mb-0 mt-1 text-xs leading-relaxed text-[var(--muted)]">
            {profile.role === "lojista"
              ? "Adicione produtos com fotografia, preço e descrição para os clientes os encontrarem."
              : "Escolha se pretende registar uma loja ou apresentar os seus serviços profissionais."}
          </p>
        </div>
      </header>
      {profile.role === "client" && (
        <>
          <StoreRegistrationForm busy={busy} onRegisterStore={onRegisterStore} />
          <ProviderRegistrationForm busy={busy} onRegisterProvider={onRegisterProvider} />
        </>
      )}
      {profile.role === "lojista" && (
        <ProductCreationForm
          session={session}
          busy={busy}
          productCategories={profile.store?.category ?? []}
          onCreateProduct={onCreateProduct}
        />
      )}
    </section>
  );
}
