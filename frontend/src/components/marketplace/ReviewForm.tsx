import { useState, type FormEvent } from "react";
import type { ReviewPayload } from "../../lib/api";

type ReviewFormProps = Readonly<{
  targetType: ReviewPayload["targetType"];
  targetId: string;
  targetName: string;
  busy: boolean;
  onSubmit: (review: ReviewPayload) => Promise<boolean>;
}>;

export default function ReviewForm({ targetType, targetId, targetName, busy, onSubmit }: ReviewFormProps) {
  const [open, setOpen] = useState(false);
  const [rating, setRating] = useState("5");
  const [comment, setComment] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const saved = await onSubmit({ targetType, targetId, rating: Number(rating), comment });
    if (saved) {
      setComment("");
      setRating("5");
      setOpen(false);
    }
  }

  return (
    <div className="review-actions">
      <button className="link-button" type="button" onClick={() => setOpen((current) => !current)}>
        {open ? "Cancelar avaliação" : "Avaliar"}
      </button>
      {open && (
        <form className="review-form" onSubmit={(event) => void submit(event)}>
          <label>
            Classificação de {targetName}
            <select value={rating} onChange={(event) => setRating(event.target.value)}>
              {[5, 4, 3, 2, 1].map((value) => <option key={value} value={value}>{value} estrelas</option>)}
            </select>
          </label>
          <label>
            Comentário (opcional)
            <textarea maxLength={1000} value={comment} onChange={(event) => setComment(event.target.value)} />
          </label>
          <button className="button button-outline" type="submit" disabled={busy}>Enviar avaliação</button>
        </form>
      )}
    </div>
  );
}
