import { memo, useCallback, useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from "react";
import { FiCheckCircle, FiStar, FiX } from "react-icons/fi";
import type { PublicReview, ReviewSubmission } from "../../lib/api";

type ReviewFormProps = Readonly<{
  targetType: ReviewSubmission["targetType"];
  targetId: string;
  targetName: string;
  busy: boolean;
  onSubmit: (review: ReviewSubmission) => Promise<PublicReview | null>;
}>;

const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

function ReviewForm({ targetType, targetId, targetName, busy, onSubmit }: ReviewFormProps) {
  const [open, setOpen] = useState(false);
  const [rating, setRating] = useState("5");
  const [comment, setComment] = useState("");
  const [image, setImage] = useState<File | null>(null);
  const [imageError, setImageError] = useState<string | null>(null);
  const previewUrl = useMemo(() => image ? URL.createObjectURL(image) : null, [image]);

  useEffect(() => () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);

  const chooseImage = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    const selected = event.currentTarget.files?.[0] ?? null;
    event.currentTarget.value = "";
    if (selected && (!ALLOWED_IMAGE_TYPES.has(selected.type) || selected.size > MAX_IMAGE_SIZE)) {
      setImage(null);
      setImageError("Escolha uma imagem JPEG, PNG ou WebP com até 5 MB.");
      return;
    }
    setImage(selected);
    setImageError(null);
  }, []);

  const submit = useCallback(async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const saved = await onSubmit({ targetType, targetId, rating: Number(rating), comment, image });
    if (saved) {
      setComment("");
      setRating("5");
      setImage(null);
      setImageError(null);
      setOpen(false);
    }
  }, [comment, image, onSubmit, rating, targetId, targetType]);

  return (
    <div className="mt-3">
      <button className="border-0 bg-transparent font-bold text-[var(--blue)] hover:text-[var(--blue)]" type="button" onClick={() => setOpen((current) => !current)}>
        {open ? <FiX aria-hidden="true" /> : <FiStar aria-hidden="true" />} {open ? "Cancelar avaliação" : "Avaliar"}
      </button>
      {open && (
        <form className="mt-[9px] grid gap-[9px] rounded-lg border border-[var(--line)] bg-[#f8fafb] p-3" onSubmit={(event) => void submit(event)}>
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
          <label>
            Fotografia do produto ou serviço (opcional)
            <input accept="image/jpeg,image/png,image/webp" onChange={chooseImage} type="file" />
          </label>
          {imageError && <p className="m-0 text-xs text-red-700" role="alert">{imageError}</p>}
          {previewUrl && <img className="max-h-48 w-fit max-w-full rounded-lg border border-[var(--line)] object-contain" src={previewUrl} alt="Pré-visualização da fotografia da avaliação" />}
          <button className="inline-flex min-h-[42px] items-center justify-center gap-[9px] rounded-lg border border-[#c8d6dd] bg-white px-[17px] text-xs font-bold text-[var(--navy)] disabled:cursor-wait disabled:opacity-[.56]" type="submit" disabled={busy}><FiCheckCircle aria-hidden="true" />Enviar avaliação</button>
        </form>
      )}
    </div>
  );
}

export default memo(ReviewForm);
