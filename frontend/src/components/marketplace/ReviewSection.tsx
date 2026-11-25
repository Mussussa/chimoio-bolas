import type { PublicReview } from "../../lib/api";

export default function ReviewSection({ reviews }: { reviews: PublicReview[] }) {
  if (!reviews.length) return <section className="detail-section"><h2>Avaliações</h2><p className="empty">Ainda não há avaliações.</p></section>;
  const average = reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length;
  return (
    <section className="detail-section">
      <h2>Avaliações <span className="detail-rating">★ {average.toFixed(1)} ({reviews.length})</span></h2>
      <div className="review-list">
        {reviews.map((review) => (
          <article className="review-item" key={review.id}>
            <b>{"★".repeat(review.rating)}{"☆".repeat(5 - review.rating)}</b>
            {review.comment && <p>{review.comment}</p>}
            <time>{new Date(review.createdAt).toLocaleDateString("pt-MZ")}</time>
          </article>
        ))}
      </div>
    </section>
  );
}
