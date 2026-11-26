import type { MapStore } from "../lib/types";

type AdminDashboardProps = Readonly<{
  stores: MapStore[];
  busy: boolean;
  onVerify: (storeId: string) => void;
}>;

export default function AdminDashboard({ stores, busy, onVerify }: AdminDashboardProps) {
  const pendingStores = stores.filter((store) => !store.verified);

  return (
    <section className="min-h-[65vh] px-[clamp(20px,7vw,100px)] py-[70px] max-[560px]:py-12" id="administracao">
      <div className="mb-[26px] flex flex-col gap-[22px] min-[851px]:flex-row min-[851px]:items-end min-[851px]:justify-between">
        <div>
          <p className="mb-1 text-[10px] font-extrabold tracking-[.17em] text-[#765900]">ADMINISTRAÇÃO</p>
          <h2 className="my-[9px] mb-2 font-[Manrope,sans-serif] text-[clamp(24px,3vw,34px)] font-extrabold tracking-[-.04em]">Verificação de lojas</h2>
          <p className="m-0 text-[13px] text-[#716e60]">Confirme lojas pendentes antes de serem apresentadas no catálogo público.</p>
        </div>
        <span className="inline-flex rounded-[5px] bg-[#fff7d6] px-2 py-1.5 text-[9px] font-extrabold tracking-[.08em] text-[#765900]">{pendingStores.length} pendentes</span>
      </div>
      <div className="grid gap-2.5">
        {pendingStores.length === 0
          ? <p className="col-span-full rounded-[10px] border border-dashed border-[#cbd8de] p-6 text-center text-[13px] text-[#716e60]">Não há lojas pendentes de verificação.</p>
          : pendingStores.map((store) => (
            <article className="flex flex-col items-start justify-between gap-[18px] rounded-[10px] border border-[#e7e1ca] bg-white p-[17px] min-[561px]:flex-row min-[561px]:items-center" key={store.id}>
              <div>
                <h3 className="mb-[5px] font-[Manrope,sans-serif] text-[15px] font-bold">{store.name}</h3>
                <p className="m-0 text-[12px] text-[#716e60]">{store.address || "Endereço não informado"}</p>
              </div>
              <button className="inline-flex min-h-[42px] items-center justify-center gap-[9px] rounded-lg border-0 bg-[#302b18] px-[17px] text-[12px] font-bold text-white transition-[transform,background-color] duration-[160ms] hover:-translate-y-px hover:bg-[#ffd21a] hover:text-[#302b18] disabled:cursor-wait disabled:opacity-[.56]" type="button" disabled={busy} onClick={() => onVerify(store.id)}>
                Verificar loja
              </button>
            </article>
          ))}
      </div>
    </section>
  );
}
