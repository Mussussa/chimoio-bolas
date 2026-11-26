import type { PublicReview } from "../../lib/api";

export default function ReviewSection({ reviews }: { reviews: PublicReview[] }) {
  if (!reviews.length) return <section className="mt-10"><h2 className="mb-4 font-[Manrope,sans-serif] text-xl font-bold">Avaliações</h2><p className="col-span-full rounded-[10px] border border-dashed border-[#cbd8de] p-6 text-center text-[13px] text-[var(--muted)]">Ainda não há avaliações.</p></section>;
  const average = reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length;
  return (
    <section className="mt-10">
      <h2 className="mb-4 font-[Manrope,sans-serif] text-xl font-bold">Avaliações <span className="ml-2 text-sm text-[#b66c20]">★ {average.toFixed(1)} ({reviews.length})</span></h2>
      <div className="grid gap-[10px]">
        {reviews.map((review) => (
          <article className="rounded-[9px] border border-[var(--line)] bg-white p-[15px]" key={review.id}>
            <b>{"★".repeat(review.rating)}{"☆".repeat(5 - review.rating)}</b>
            {review.comment && <p>{review.comment}</p>}
            <time>{new Date(review.createdAt).toLocaleDateString("pt-MZ")}</time>
          </article>
        ))}
      </div>
    </section>
  );
}
