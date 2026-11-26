import { useState } from "react";
import { FiCopy, FiShare2 } from "react-icons/fi";

type SharePageButtonProps = Readonly<{
  title: string;
  text: string;
  label?: string;
  url?: string;
  imageUrl?: string;
}>;

const imageExtensions: Record<string, string> = {
  "image/gif": "gif",
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp"
};

export default function SharePageButton({ title, text, label = "Partilhar", url, imageUrl }: SharePageButtonProps) {
  const [feedback, setFeedback] = useState("");
  const [showLink, setShowLink] = useState(false);
  const shareUrl = url ?? `${window.location.origin}${window.location.pathname}${window.location.search}`;

  async function sharePage() {
    setShowLink(false);
    setFeedback("");

    if (!navigator.share) {
      setFeedback("A partilha directa não está disponível neste dispositivo. Podes copiar o link.");
      setShowLink(true);
      return;
    }

    const shareData: ShareData = { title, text, url: shareUrl };
    let imageWarning = "";

    if (imageUrl && navigator.canShare) {
      try {
        const imageLocation = new URL(imageUrl, window.location.href);
        if (imageLocation.protocol !== "https:" && imageLocation.origin !== window.location.origin) {
          throw new Error("A imagem não pode ser partilhada neste endereço.");
        }
        const response = await fetch(imageLocation, { credentials: "omit" });
        if (!response.ok) throw new Error("Não foi possível carregar a imagem do produto.");
        const image = await response.blob();
        if (!image.type.startsWith("image/")) throw new Error("O ficheiro do produto não é uma imagem.");
        const file = new File([image], `produto.${imageExtensions[image.type] ?? "jpg"}`, { type: image.type });
        if (navigator.canShare({ files: [file] })) shareData.files = [file];
        else imageWarning = " Este dispositivo não permite anexar a imagem.";
      } catch (error) {
        imageWarning = ` A imagem não pôde ser incluída: ${error instanceof Error ? error.message : "erro ao carregar"}`;
      }
    } else if (imageUrl) {
      imageWarning = " Este dispositivo não permite anexar a imagem.";
    }

    try {
      await navigator.share(shareData);
      if (imageWarning) setFeedback(`Link partilhado.${imageWarning}`);
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      setFeedback(`Não foi possível abrir a partilha.${imageWarning} Podes copiar o link abaixo.`);
      setShowLink(true);
    }
  }

  async function copyLink() {
    setShowLink(false);
    setFeedback("");
    if (navigator.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(shareUrl);
        setFeedback("Link copiado. Já podes partilhar.");
        return;
      } catch {
        setFeedback("Não foi possível copiar automaticamente. Copia o link abaixo.");
      }
    } else {
      setFeedback("Copia o link abaixo para partilhar.");
    }
    setShowLink(true);
  }

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        <button type="button" className="inline-flex min-h-[42px] items-center justify-center gap-[9px] rounded-lg border border-[#c8d6dd] bg-white px-[17px] text-xs font-bold text-[var(--navy)]" onClick={() => void sharePage()}>
          <FiShare2 aria-hidden="true" />{label}
        </button>
        <button type="button" className="inline-flex min-h-[42px] items-center justify-center gap-[9px] rounded-lg border border-[#c8d6dd] bg-white px-[17px] text-xs font-bold text-[var(--navy)]" onClick={() => void copyLink()}>
          <FiCopy aria-hidden="true" />Copiar link
        </button>
      </div>
      {feedback && <p role="status">{feedback}</p>}
      {showLink && (
        <input
          aria-label="Link público para partilhar"
          readOnly
          value={shareUrl}
          onFocus={(event) => event.currentTarget.select()}
        />
      )}
    </div>
  );
}
