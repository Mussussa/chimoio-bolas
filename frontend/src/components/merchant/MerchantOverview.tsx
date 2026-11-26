import type { MerchantProduct, MerchantStore } from "../../lib/api";
import { formatMerchantMoney } from "./merchantTypes";
import CategoryImage from "../marketplace/CategoryImage";
import { FALLBACK_IMAGE, STORE_CATEGORY_IMAGES } from "../../lib/categoryPlaceholders";

type MerchantOverviewProps = Readonly<{
  store: MerchantStore;
  products: MerchantProduct[];
  onEditStore: () => void;
  onManageProducts: () => void;
}>;

export default function MerchantOverview({ store, products, onEditStore, onManageProducts }: MerchantOverviewProps) {
  return (
    <div>
      <div className="mb-4 grid grid-cols-1 gap-3 min-[851px]:grid-cols-3">
        <article className="grid gap-[10px] rounded-lg border border-[var(--line)] bg-white px-5 py-[18px]"><span className="text-xs text-[var(--muted)]">Produtos publicados</span><strong className="font-[Manrope,sans-serif] text-2xl font-bold text-[var(--navy)]">{products.length}</strong></article>
        <article className="grid gap-[10px] rounded-lg border border-[var(--line)] bg-white px-5 py-[18px]"><span className="text-xs text-[var(--muted)]">Categorias da loja</span><strong className="font-[Manrope,sans-serif] text-2xl font-bold text-[var(--navy)]">{store.category.length}</strong></article>
        <article className="grid gap-[10px] rounded-lg border border-[var(--line)] bg-white px-5 py-[18px]"><span className="text-xs text-[var(--muted)]">Estado</span><strong className="font-[Manrope,sans-serif] text-2xl font-bold text-[var(--navy)]">{store.verified ? "Verificada" : "Não verificada"}</strong></article>
      </div>
      <div className="grid grid-cols-1 gap-4 min-[851px]:grid-cols-2">
        <section className="min-w-0 rounded-lg border border-[var(--line)] bg-white p-[17px]">
          <div className="mb-4 flex items-center justify-between gap-[14px]">
            <h2 className="m-0 font-[Manrope,sans-serif] text-lg font-bold text-[var(--navy)]">Perfil da loja</h2>
            <button type="button" className="border-0 bg-transparent font-bold text-[var(--blue)]" onClick={onEditStore}>Editar dados</button>
          </div>
          <CategoryImage className="mb-3 h-[82px] w-[82px] flex-none rounded-lg border border-[var(--line)] bg-[#f5f8f9] object-cover" src={store.logoUrl} placeholder={STORE_CATEGORY_IMAGES[store.category[0]] ?? FALLBACK_IMAGE} alt={`Logótipo de ${store.name}`} />
          <p className="mt-[7px] text-xs leading-[1.6] text-[var(--muted)]">{store.description || "Adicione uma descrição para apresentar melhor a sua loja."}</p>
          <dl className="mt-[18px] grid gap-3">
            <div className="grid grid-cols-[110px_1fr] gap-[10px] text-xs max-[850px]:grid-cols-1 max-[850px]:gap-1"><dt className="text-[var(--muted)]">Endereço</dt><dd className="m-0 font-semibold text-[var(--navy)]">{store.address || "Não informado"}</dd></div>
            <div className="grid grid-cols-[110px_1fr] gap-[10px] text-xs max-[850px]:grid-cols-1 max-[850px]:gap-1"><dt className="text-[var(--muted)]">Categorias</dt><dd className="m-0 font-semibold text-[var(--navy)]">{store.category.join(", ") || "Sem categorias"}</dd></div>
            <div className="grid grid-cols-[110px_1fr] gap-[10px] text-xs max-[850px]:grid-cols-1 max-[850px]:gap-1"><dt className="text-[var(--muted)]">Identificador</dt><dd className="m-0 font-semibold text-[var(--navy)]">/{store.slug}</dd></div>
          </dl>
        </section>
        <section className="min-w-0 rounded-lg border border-[var(--line)] bg-white p-[17px]">
          <div className="mb-4 flex items-center justify-between gap-[14px]">
            <h2 className="m-0 font-[Manrope,sans-serif] text-lg font-bold text-[var(--navy)]">Produtos recentes</h2>
            <button type="button" className="border-0 bg-transparent font-bold text-[var(--blue)]" onClick={onManageProducts}>Gerir produtos</button>
          </div>
          {products.length === 0 ? <p>Ainda não há produtos cadastrados.</p> : products.slice(0, 4).map((product) => (
            <div className="flex justify-between gap-3 border-b border-[#edf1f3] py-3 text-xs text-[var(--navy)]" key={product.id}>
              <span>{product.name}</span>
              <strong className="whitespace-nowrap">{formatMerchantMoney(product.price)}</strong>
            </div>
          ))}
        </section>
      </div>
    </div>
  );
}