import type { MerchantProduct, MerchantStore } from "../../lib/api";
import { formatMerchantMoney } from "./merchantTypes";

type MerchantOverviewProps = Readonly<{
  store: MerchantStore;
  products: MerchantProduct[];
  onEditStore: () => void;
  onManageProducts: () => void;
}>;

export default function MerchantOverview({ store, products, onEditStore, onManageProducts }: MerchantOverviewProps) {
  return (
    <div className="merchant-overview">
      <div className="merchant-stats">
        <article><span>Produtos publicados</span><strong>{products.length}</strong></article>
        <article><span>Categorias da loja</span><strong>{store.category.length}</strong></article>
        <article><span>Estado</span><strong>{store.verified ? "Verificada" : "Em análise"}</strong></article>
      </div>
      <div className="merchant-overview-grid">
        <section className="merchant-panel">
          <div className="merchant-panel-heading">
            <h2>Perfil da loja</h2>
            <button type="button" className="link-button" onClick={onEditStore}>Editar dados</button>
          </div>
          {store.logoUrl && <img className="merchant-store-logo merchant-store-logo-large" src={store.logoUrl} alt={`Logótipo de ${store.name}`} />}
          <p>{store.description || "Adicione uma descrição para apresentar melhor a sua loja."}</p>
          <dl className="merchant-details">
            <div><dt>Endereço</dt><dd>{store.address || "Não informado"}</dd></div>
            <div><dt>Categorias</dt><dd>{store.category.join(", ") || "Sem categorias"}</dd></div>
            <div><dt>Identificador</dt><dd>/{store.slug}</dd></div>
          </dl>
        </section>
        <section className="merchant-panel">
          <div className="merchant-panel-heading">
            <h2>Produtos recentes</h2>
            <button type="button" className="link-button" onClick={onManageProducts}>Gerir produtos</button>
          </div>
          {products.length === 0 ? <p>Ainda não há produtos cadastrados.</p> : products.slice(0, 4).map((product) => (
            <div className="merchant-recent-product" key={product.id}>
              <span>{product.name}</span>
              <strong>{formatMerchantMoney(product.price)}</strong>
            </div>
          ))}
        </section>
      </div>
    </div>
  );
}