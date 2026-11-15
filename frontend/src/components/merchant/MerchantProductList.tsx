import { useState, type FormEvent, type ReactNode } from "react";
import type { MerchantProduct } from "../../lib/api";
import type { MerchantProductDraft } from "./merchantTypes";
import { formatMerchantMoney, STORE_CATEGORIES } from "./merchantTypes";

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
    <div className="merchant-products">
      <section className="merchant-panel">
        <div className="merchant-panel-heading">
          <div><h2>Inventário</h2><p>{products.length} {products.length === 1 ? "produto" : "produtos"} na loja</p></div>
          <button type="button" className="button button-outline" onClick={onRefresh} disabled={saving}>Actualizar lista</button>
        </div>
        {products.length === 0 && <p className="merchant-empty">Ainda não adicionou produtos. Use o formulário abaixo para publicar o primeiro.</p>}
        {products.map((product) => (
          <article className="merchant-product-row" key={product.id}>
            {editingProductId === product.id && productDraft ? (
              <form className="merchant-product-edit form-grid" onSubmit={saveProduct}>
                <label>Nome<input required maxLength={160} value={productDraft.name} onChange={(event) => setProductDraft((current) => current && ({ ...current, name: event.target.value }))} /></label>
                <label>Preço (MT)<input required type="number" min="0.01" step="0.01" value={productDraft.price} onChange={(event) => setProductDraft((current) => current && ({ ...current, price: event.target.value }))} /></label>
                <label>Categoria<select required value={productDraft.category} onChange={(event) => setProductDraft((current) => current && ({ ...current, category: event.target.value }))}>{STORE_CATEGORIES.map((category) => <option key={category}>{category}</option>)}</select></label>
                <label>Quantidade mínima<input required type="number" min="1" max="100000" step="1" value={productDraft.minOrderQty} onChange={(event) => setProductDraft((current) => current && ({ ...current, minOrderQty: Number(event.target.value) }))} /></label>
                <label className="wide">Descrição<textarea required maxLength={4000} value={productDraft.description} onChange={(event) => setProductDraft((current) => current && ({ ...current, description: event.target.value }))} /></label>
                <div className="merchant-row-actions">
                  <button type="submit" className="button button-dark" disabled={saving}>{saving ? "A guardar..." : "Guardar"}</button>
                  <button type="button" className="button button-outline" onClick={() => setEditingProductId(null)}>Cancelar</button>
                </div>
              </form>
            ) : <>
              {product.images?.[0] && <img className="merchant-product-image" src={product.images[0]} alt={product.name} />}
              <div className="merchant-product-info">
                <h3>{product.name}</h3>
                <p>{product.category} · Quantidade mínima: {product.minOrderQty ?? 1}</p>
                <strong>{formatMerchantMoney(product.price)}</strong>
              </div>
              <div className="merchant-row-actions">
                <button type="button" className="button button-outline" onClick={() => beginEdit(product)}>Editar</button>
                <button type="button" className="button button-danger" onClick={() => onDeleteProduct(product)} disabled={saving}>Remover</button>
              </div>
            </>}
          </article>
        ))}
      </section>
      {children}
    </div>
  );
}