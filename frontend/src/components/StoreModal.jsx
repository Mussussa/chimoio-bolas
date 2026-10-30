import { useState } from "react";
import { MapPin, Star, X } from "lucide-react";
import { api } from "../api.js";

export default function StoreModal({ store, activeUser, onClose, onNotify, onRefresh }) {
  const [stars, setStars] = useState(5);
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);
  const average = store.avaliacoes?.length ? store.avaliacoes.reduce((sum, item) => sum + item.estrelas, 0) / store.avaliacoes.length : 0;

  async function submitReview(event) {
    event.preventDefault();
    setBusy(true);
    try {
      await api(`/lojas/${store.providerId ?? store.id}/avaliar`, { method: "POST", body: { userId: activeUser?.id, estrelas: stars, comentario: comment } });
      await onRefresh();
      onNotify("Obrigado pela sua avaliação!");
      onClose();
    } catch (error) {
      onNotify(error.message, true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="store-modal modal-card" role="dialog" aria-modal="true" aria-label={store.nome}>
        <button className="modal-close" onClick={onClose} aria-label="Fechar"><X size={20} /></button>
        <div className="store-modal-head"><span className="store-avatar">{store.nome.slice(0, 1)}</span><div><span className="eyebrow">{store.tipo === "produto" ? "Produtos locais" : "Serviço local"}</span><h2>{store.nome}</h2><p><MapPin size={14} /> {store.bairro}, Chimoio · {store.visitas} visitas</p></div></div>
        <div className="store-rating"><span className="stars">{average ? "★".repeat(Math.round(average)) : "☆☆☆☆☆"}</span><b>{average ? average.toFixed(1) : "Novo"}</b><small>({store.avaliacoes?.length ?? 0} avaliações)</small></div>
        <h3>O que há por aqui</h3>
        <div className="store-products">{(store.anuncios ?? []).map((ad) => <div className="store-product" key={ad.id}><img src={ad.fotoUrl} alt="" /><span><b>{ad.titulo}</b><small>{Number(ad.preco).toLocaleString("pt-MZ")} MT</small></span></div>)}</div>
        <h3>Comentários</h3>
        <div className="review-list">{(store.avaliacoes ?? []).map((review, index) => <div className="review" key={`${review.userId}-${index}`}><span>{review.nome}</span><span className="stars">{"★".repeat(review.estrelas)}</span><p>{review.comentario || "Sem comentário."}</p></div>)}{!store.avaliacoes?.length && <p className="muted-copy">Ainda não há avaliações. Conte a sua experiência.</p>}</div>
        {activeUser?.role === "cliente" && !store.avaliacoes?.some((review) => review.userId === activeUser.id) && <form className="review-form" onSubmit={submitReview}>
          <label>A sua avaliação <span className="star-picker">{[1, 2, 3, 4, 5].map((value) => <button type="button" key={value} onClick={() => setStars(value)} aria-label={`${value} estrelas`}><Star size={18} fill={value <= stars ? "currentColor" : "none"} /></button>)}</span></label>
          <textarea value={comment} onChange={(event) => setComment(event.target.value)} placeholder="Como foi a sua experiência?" rows="2" />
          <button className="button button-dark" disabled={busy}>{busy ? "A enviar..." : "Publicar avaliação"}</button>
        </form>}
      </section>
    </div>
  );
}
