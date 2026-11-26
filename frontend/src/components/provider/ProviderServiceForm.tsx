import { useEffect, useState, type ChangeEvent, type FormEvent } from "react";
import type { ProviderService } from "../../lib/api";
import type { ProviderServiceForm as ProviderServiceDraft } from "../../lib/types";
import { EMPTY_PROVIDER_SERVICE_FORM } from "./providerTypes";

type ProviderServiceFormProps = Readonly<{
  categories: string[];
  saving: boolean;
  initialService?: ProviderService | null;
  onSubmit: (draft: ProviderServiceDraft, newPhotos: File[], currentPhotos: string[]) => Promise<void>;
  onCancelEdit: () => void;
}>;

const MAX_PHOTOS = 8;
const MAX_PHOTO_BYTES = 5 * 1024 * 1024;
const PHOTO_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

export default function ProviderServiceForm({
  categories,
  saving,
  initialService,
  onSubmit,
  onCancelEdit
}: ProviderServiceFormProps) {
  const [draft, setDraft] = useState<ProviderServiceDraft>(EMPTY_PROVIDER_SERVICE_FORM);
  const [currentPhotos, setCurrentPhotos] = useState<string[]>([]);
  const [newPhotos, setNewPhotos] = useState<File[]>([]);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [previews, setPreviews] = useState<string[]>([]);

  useEffect(() => {
    setDraft(initialService ? {
      title: initialService.title,
      description: initialService.description,
      category: initialService.category,
      price: initialService.price,
      deliveryTime: initialService.deliveryTime
    } : EMPTY_PROVIDER_SERVICE_FORM);
    setCurrentPhotos(initialService?.images ?? []);
    setNewPhotos([]);
    setPhotoError(null);
  }, [initialService]);

  useEffect(() => {
    const objectUrls = newPhotos.map((file) => URL.createObjectURL(file));
    setPreviews(objectUrls);
    return () => objectUrls.forEach((url) => URL.revokeObjectURL(url));
  }, [newPhotos]);

  function choosePhotos(event: ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(event.target.files ?? []);
    if (selected.some((file) => !PHOTO_TYPES.has(file.type) || file.size > MAX_PHOTO_BYTES)) {
      setPhotoError("Cada imagem deve ser JPEG, PNG ou WebP e ter até 5 MB.");
      event.target.value = "";
      return;
    }
    if (currentPhotos.length + newPhotos.length + selected.length > MAX_PHOTOS) {
      setPhotoError(`Cada serviço pode ter no máximo ${MAX_PHOTOS} imagens.`);
      event.target.value = "";
      return;
    }
    setPhotoError(null);
    setNewPhotos((current) => [...current, ...selected]);
    event.target.value = "";
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void onSubmit(draft, newPhotos, currentPhotos);
  }

  function getSubmitLabel() {
    if (saving) return "A publicar...";
    if (initialService) return "Guardar alterações";
    return "Publicar serviço";
  }

  return (
    <form className="grid gap-4 min-w-0 rounded-lg border border-[var(--line)] bg-white p-[17px]" onSubmit={submit}>
      <header className="mb-0 flex items-center justify-between gap-[14px]">
        <div><p className="mb-[6px] text-[10px] font-extrabold tracking-[.17em] text-[var(--green)]">{initialService ? "EDITAR PUBLICAÇÃO" : "NOVA PUBLICAÇÃO"}</p><h2 className="m-0 font-[Manrope,sans-serif] text-lg font-bold text-[var(--navy)]">{initialService ? "Atualize o serviço" : "Divulgue um serviço"}</h2></div>
        {initialService && <button type="button" className="border-0 bg-transparent font-bold text-[var(--blue)]" onClick={onCancelEdit}>Cancelar edição</button>}
      </header>
      <div className="grid grid-cols-1 gap-[14px] min-[851px]:grid-cols-2 [&>label]:grid [&>label]:gap-[7px] [&>label]:text-[11px] [&>label]:font-bold [&>label]:text-[#506472] [&_small]:text-[11px] [&_small]:font-normal [&_small]:text-[var(--muted)]">
        <label>Título do serviço<input required maxLength={180} value={draft.title} onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))} placeholder="Ex.: Instalação elétrica residencial" /></label>
        <label>Categoria<select required value={draft.category} onChange={(event) => setDraft((current) => ({ ...current, category: event.target.value }))}>
          <option value="">Escolher área de atuação</option>
          {categories.map((category) => <option key={category} value={category}>{category}</option>)}
        </select></label>
        <label>Preço (MT)<input required type="number" min="0" step="0.01" value={draft.price} onChange={(event) => setDraft((current) => ({ ...current, price: event.target.value }))} /></label>
        <label>Prazo de execução<input required maxLength={100} value={draft.deliveryTime} onChange={(event) => setDraft((current) => ({ ...current, deliveryTime: event.target.value }))} placeholder="Ex.: 1 dia" /></label>
        <label className="col-span-full max-[850px]:col-auto">Descrição<textarea required maxLength={5000} value={draft.description} onChange={(event) => setDraft((current) => ({ ...current, description: event.target.value }))} /></label>
        <label className="col-span-full max-[850px]:col-auto">Fotografias do serviço<input type="file" multiple accept="image/jpeg,image/png,image/webp" onChange={choosePhotos} /><small>Até 8 imagens, 5 MB cada. JPEG, PNG ou WebP.</small></label>
      </div>
      {(currentPhotos.length > 0 || previews.length > 0) && (
        <div className="grid grid-cols-3 gap-2" aria-label="Imagens do serviço">
          {currentPhotos.map((url, index) => <figure className="relative m-0 aspect-square overflow-hidden rounded-md bg-[#eef2f4]" key={url}>
            <img className="h-full w-full object-cover" src={url} alt={`Imagem ${index + 1} do serviço`} />
            <button className="absolute right-[5px] top-[5px] h-[26px] w-[26px] rounded-full border-0 bg-[#172b3bcc] text-lg leading-none text-white" type="button" aria-label="Remover imagem" onClick={() => setCurrentPhotos((photos) => photos.filter((photo) => photo !== url))}>×</button>
          </figure>)}
          {previews.map((url, index) => <figure className="relative m-0 aspect-square overflow-hidden rounded-md bg-[#eef2f4]" key={url}>
            <img className="h-full w-full object-cover" src={url} alt={`Nova imagem ${index + 1}`} />
            <button className="absolute right-[5px] top-[5px] h-[26px] w-[26px] rounded-full border-0 bg-[#172b3bcc] text-lg leading-none text-white" type="button" aria-label="Remover imagem" onClick={() => setNewPhotos((photos) => photos.filter((_, photoIndex) => photoIndex !== index))}>×</button>
          </figure>)}
        </div>
      )}
      {photoError && <p className="m-0 rounded-md bg-[#fff0ec] px-[11px] py-[9px] text-xs text-[#9e3b2e]" role="alert">{photoError}</p>}
      <button className="inline-flex min-h-[42px] items-center justify-center gap-[9px] justify-self-start rounded-lg bg-[var(--navy)] px-[17px] text-xs font-bold text-white disabled:cursor-wait disabled:opacity-[.56]" type="submit" disabled={saving || categories.length === 0}>
        {getSubmitLabel()}
      </button>
    </form>
  );
}