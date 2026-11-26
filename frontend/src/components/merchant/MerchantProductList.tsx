import { useState, type FormEvent, type ReactNode } from "react";
import type { MerchantProduct } from "../../lib/api";
import type { MerchantProductDraft } from "./merchantTypes";
import { formatMerchantMoney, STORE_CATEGORIES } from "./merchantTypes";
import CategoryImage from "../marketplace/CategoryImage";
import { FALLBACK_IMAGE, STORE_CATEGORY_IMAGES } from "../../lib/categoryPlaceholders";

type MerchantProductListProps = Readonly<{
  products: MerchantProduct[];
  saving: boolean;
  children: ReactNode;
  onRefresh: () => void;
  onSaveProduct: (product: MerchantProduct, draft: MerchantProductDraft) => Promise<boolean>;
  onDeleteProduct: (product: MerchantProduct) => void;
}>;

export default function MerchantProductList({
  products,
  saving,
  children,
  onRefresh,
  onSaveProduct,
  onDeleteProduct
}: MerchantProductListProps) {
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [productDraft, setProductDraft] = useState<MerchantProductDraft | null>(null);

  function beginEdit(product: MerchantProduct) {
    setEditingProductId(product.id);
    setProductDraft({
      name: product.name,
      description: product.description,
      price: product.price,
      category: product.category,
      minOrderQty: product.minOrderQty ?? 1
    });
  }

  async function saveProduct(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const product = products.find((item) => item.id === editingProductId);
    if (!product || !productDraft) return;
    if (await onSaveProduct(product, productDraft)) {
      setEditingProductId(null);
      setProductDraft(null);
    }
  }

  return (
    <div className="grid gap-[18px]">
      <section className="min-w-0 rounded-lg border border-[var(--line)] bg-white p-[17px]">
        <div className="mb-4 flex items-center justify-between gap-[14px]">
          <div><h2 className="m-0 font-[Manrope,sans-serif] text-lg font-bold text-[var(--navy)]">Inventário</h2><p className="mt-[7px] text-xs leading-[1.6] text-[var(--muted)]">{products.length} {products.length === 1 ? "produto" : "produtos"} na loja</p></div>
          <button type="button" className="inline-flex min-h-[42px] items-center justify-center gap-[9px] rounded-lg border border-[#c8d6dd] bg-white px-[17px] text-xs font-bold text-[var(--navy)] disabled:cursor-wait disabled:opacity-[.56]" onClick={onRefresh} disabled={saving}>Actualizar lista</button>
        </div>
        {products.length === 0 && <p className="py-3">Ainda não adicionou produtos. Use o formulário abaixo para publicar o primeiro.</p>}
        {products.map((product) => (
          <article className="flex flex-wrap items-start gap-4 border-t border-[#edf1f3] py-[14px]">
            {editingProductId === product.id && productDraft ? (
              <form className="grid w-full grid-cols-1 gap-[14px] min-[851px]:grid-cols-2 [&>label]:grid [&>label]:gap-[7px] [&>label]:text-[11px] [&>label]:font-bold [&>label]:text-[#506472]" onSubmit={saveProduct}>
                <label>Nome<input required maxLength={160} value={productDraft.name} onChange={(event) => setProductDraft((current) => current && ({ ...current, name: event.target.value }))} /></label>
                <label>Preço (MT)<input required type="number" min="0.01" step="0.01" value={productDraft.price} onChange={(event) => setProductDraft((current) => current && ({ ...current, price: event.target.value }))} /></label>
                <label>Categoria<select required value={productDraft.category} onChange={(event) => setProductDraft((current) => current && ({ ...current, category: event.target.value }))}>{STORE_CATEGORIES.map((category) => <option key={category}>{category}</option>)}</select></label>
                <label>Quantidade mínima<input required type="number" min="1" max="100000" step="1" value={productDraft.minOrderQty} onChange={(event) => setProductDraft((current) => current && ({ ...current, minOrderQty: Number(event.target.value) }))} /></label>
                <label className="col-span-full max-[850px]:col-auto">Descrição<textarea required maxLength={4000} value={productDraft.description} onChange={(event) => setProductDraft((current) => current && ({ ...current, description: event.target.value }))} /></label>
                <div className="flex w-full flex-wrap gap-2">
                  <button type="submit" className="inline-flex min-h-[42px] items-center justify-center gap-[9px] rounded-lg bg-[var(--navy)] px-[17px] text-xs font-bold text-white disabled:cursor-wait disabled:opacity-[.56]" disabled={saving}>{saving ? "A guardar..." : "Guardar"}</button>
                  <button type="button" className="inline-flex min-h-[36px] items-center justify-center gap-[9px] rounded-lg border border-[#c8d6dd] bg-white px-3 text-xs font-bold text-[var(--navy)]" onClick={() => setEditingProductId(null)}>Cancelar</button>
                </div>
              </form>
            ) : <>
              <CategoryImage className="h-[68px] w-[68px] flex-none rounded-md bg-[#eef2f4] object-cover" src={product.images?.[0]} placeholder={STORE_CATEGORY_IMAGES[product.category] ?? FALLBACK_IMAGE} alt={product.name} />
              <div className="min-w-0 flex-1 basis-[calc(100%-84px)]">
                <h3 className="mb-[5px] font-[Manrope,sans-serif] text-sm font-bold text-[var(--navy)]">{product.name}</h3>
                <p className="mb-1.5 text-[11px] text-[var(--muted)]">{product.category} · Quantidade mínima: {product.minOrderQty ?? 1}</p>
                <strong className="text-[13px] text-[var(--green)]">{formatMerchantMoney(product.price)}</strong>
              </div>
              <div className="flex w-full flex-wrap gap-2">
                <button type="button" className="inline-flex min-h-[36px] items-center justify-center gap-[9px] rounded-lg border border-[#c8d6dd] bg-white px-3 text-xs font-bold text-[var(--navy)]" onClick={() => beginEdit(product)}>Editar</button>
                <button type="button" className="inline-flex min-h-[36px] items-center justify-center gap-[9px] rounded-lg border border-[#f0cfc8] bg-[#fff7f5] px-3 text-xs font-bold text-[#9e3b2e] disabled:cursor-wait disabled:opacity-[.56]" onClick={() => onDeleteProduct(product)} disabled={saving}>Remover</button>
              </div>
            </>}
          </article>
        ))}
      </section>
      {children}
    </div>
  );
}