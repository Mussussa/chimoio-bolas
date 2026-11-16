import type { MapStore } from "../lib/types";

type AdminDashboardProps = Readonly<{
  stores: MapStore[];
  busy: boolean;
  onVerify: (storeId: string) => void;
}>;

export default function AdminDashboard({ stores, busy, onVerify }: AdminDashboardProps) {
  const pendingStores = stores.filter((store) => !store.verified);

  return (
    <section className="section admin-dashboard" id="administracao">
      <div className="section-head">
        <div>
          <p className="eyebrow">ADMINISTRAÇÃO</p>
          <h2>Verificação de lojas</h2>
          <p>Confirme lojas pendentes antes de serem apresentadas no catálogo público.</p>
        </div>
        <span className="tag">{pendingStores.length} pendentes</span>
      </div>
      <div className="admin-store-list">
        {pendingStores.length === 0
          ? <p className="empty">Não há lojas pendentes de verificação.</p>
          : pendingStores.map((store) => (
            <article className="admin-store-card" key={store.id}>
              <div>
                <h3>{store.name}</h3>
                <p>{store.address || "Endereço não informado"}</p>
              </div>
              <button className="button button-dark" type="button" disabled={busy} onClick={() => onVerify(store.id)}>
                Verificar loja
              </button>
            </article>
          ))}
      </div>
    </section>
  );
}
