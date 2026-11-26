import { memo, useMemo } from "react";
import type { PublicReview } from "../../lib/api";
import { FiUser } from "react-icons/fi";

function ReviewSection({ reviews }: { reviews: PublicReview[] }) {
  const average = useMemo(
    () => reviews.length ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length : null,
    [reviews]
  );
  if (!reviews.length) return <section className="mt-10"><h2 className="mb-4 font-[Manrope,sans-serif] text-xl font-bold">Avaliações</h2><p className="col-span-full rounded-[10px] border border-dashed border-[#cbd8de] p-6 text-center text-[13px] text-[var(--muted)]">Ainda não há avaliações.</p></section>;
  return (
    <section className="mt-10">
      <h2 className="mb-4 font-[Manrope,sans-serif] text-xl font-bold">Avaliações <span className="ml-2 text-sm text-[#b66c20]">★ {average?.toFixed(1)} ({reviews.length})</span></h2>
      <div className="grid gap-[10px]">
        {reviews.map((review) => (
          <article className="rounded-[9px] border border-[var(--line)] bg-white p-[15px]" key={review.id}>
            <header className="mb-3 flex items-center gap-3">
              {review.client?.avatarUrl
                ? <img className="h-10 w-10 rounded-full border border-[var(--line)] bg-[#eaf1f4] object-cover" src={review.client.avatarUrl} alt="" />
                : <span className="grid h-10 w-10 place-items-center rounded-full bg-[#eaf1f4] text-[var(--blue)]" aria-hidden="true"><FiUser /></span>}
              <div className="grid gap-1">
                {review.client?.name && <b className="text-xs text-[var(--navy)]">{review.client.name}</b>}
                <b className="text-sm text-[#b66c20]">{"★".repeat(review.rating)}{"☆".repeat(5 - review.rating)}</b>
              </div>
            </header>
            {review.comment && <p>{review.comment}</p>}
            {review.imageUrl && (
              <a className="mt-3 inline-block rounded-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--blue)]" href={review.imageUrl} target="_blank" rel="noreferrer" aria-label="Abrir fotografia da avaliação num novo separador">
                <img className="max-h-64 max-w-full rounded-lg border border-[var(--line)] object-contain" src={review.imageUrl} alt="Fotografia do produto ou serviço avaliado" loading="lazy" />
              </a>
            )}
            <time>{new Date(review.createdAt).toLocaleDateString("pt-MZ")}</time>
          </article>
        ))}
      </div>
    </section>
  );
}

export default memo(ReviewSection);
