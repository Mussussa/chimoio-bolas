import { useEffect, useState, type ChangeEvent, type FormEvent } from "react";
import type { ProviderProfileDraft } from "./providerTypes";
import { PROVIDER_CATEGORIES } from "./providerTypes";
import { CHIMOIO_NEIGHBORHOODS } from "../../lib/chimoioNeighborhoods";

type ProviderProfileFormProps = Readonly<{
  draft: ProviderProfileDraft;
  avatarUrl: string | null;
  saving: boolean;
  uploading: boolean;
  onSave: (draft: ProviderProfileDraft, avatar: File | null) => Promise<void>;
  onDraftChange: (draft: ProviderProfileDraft) => void;
  onToggleCategory: (category: string) => void;
}>;

const MAX_PHOTO_BYTES = 5 * 1024 * 1024;
const PHOTO_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

export default function ProviderProfileForm({
  draft,
  avatarUrl,
  saving,
  uploading,
  onSave,
  onDraftChange,
  onToggleCategory
}: ProviderProfileFormProps) {
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [photoError, setPhotoError] = useState<string | null>(null);

  useEffect(() => {
    if (!avatarFile) {
      setPreviewUrl(null);
      return;
    }
    const objectUrl = URL.createObjectURL(avatarFile);
    setPreviewUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [avatarFile]);

  function chooseAvatar(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!PHOTO_TYPES.has(file.type) || file.size > MAX_PHOTO_BYTES) {
      setPhotoError("Escolha uma imagem JPEG, PNG ou WebP com até 5 MB.");
      event.target.value = "";
      return;
    }
    setPhotoError(null);
    setAvatarFile(file);
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void onSave(draft, avatarFile);
  }

  function getSaveButtonLabel() {
    if (uploading) return "A carregar fotografia...";
    if (saving) return "A guardar...";
    return "Guardar perfil";
  }

  return (
    <form className="grid gap-4 min-w-0 rounded-lg border border-[var(--line)] bg-white p-[17px]" onSubmit={submit}>
      <header className="mb-0 flex items-center justify-between gap-[14px]">
        <div><p className="mb-[6px] text-[10px] font-extrabold tracking-[.17em] text-[var(--green)]">PERFIL PROFISSIONAL</p><h2 className="m-0 font-[Manrope,sans-serif] text-lg font-bold text-[var(--navy)]">Apresente o seu trabalho</h2></div>
      </header>
      <div className="mb-5 flex flex-col items-start gap-[18px]">
        {previewUrl || avatarUrl
          ? <img className="h-[82px] w-[82px] flex-none rounded-full border border-[var(--line)] bg-[#eef4f2] object-cover" src={previewUrl ?? avatarUrl ?? ""} alt="Fotografia de perfil" />
          : <span className="grid h-[82px] w-[82px] flex-none place-items-center rounded-full bg-[var(--green)] font-[Manrope,sans-serif] text-[26px] font-bold text-white" aria-hidden="true">{draft.name.slice(0, 1).toLocaleUpperCase() || "P"}</span>}
        <label className="grid gap-[7px] text-[11px] font-bold text-[#506472]">
          <span>Fotografia de perfil</span>
          <input type="file" accept="image/jpeg,image/png,image/webp" onChange={chooseAvatar} />
          <small className="text-[11px] font-normal text-[var(--muted)]">JPEG, PNG ou WebP, até 5 MB.</small>
        </label>
      </div>
      {photoError && <p className="m-0 rounded-md bg-[#fff0ec] px-[11px] py-[9px] text-xs text-[#9e3b2e]" role="alert">{photoError}</p>}
      <div className="grid grid-cols-1 gap-[14px] min-[851px]:grid-cols-2 [&>label]:grid [&>label]:gap-[7px] [&>label]:text-[11px] [&>label]:font-bold [&>label]:text-[#506472]">
        <label>Nome público<input required maxLength={120} value={draft.name} onChange={(event) => onDraftChange({ ...draft, name: event.target.value })} /></label>
        <label>Preço-base ou visita (MT)<input required type="number" min="0" step="0.01" value={draft.basePrice} onChange={(event) => onDraftChange({ ...draft, basePrice: event.target.value })} /></label>
        <label className="col-span-full max-[850px]:col-auto">
          Bairro onde presta serviços
          <select required value={draft.neighborhood} onChange={(event) => onDraftChange({ ...draft, neighborhood: event.target.value })}>
            <option value="">-- Escolha o bairro --</option>
            {CHIMOIO_NEIGHBORHOODS.map((neighborhood) => (
              <option key={neighborhood.name} value={neighborhood.name}>{neighborhood.name}</option>
            ))}
          </select>
          <small>O mapa apresenta a localização aproximada no centro do bairro.</small>
        </label>
        <label className="col-span-full max-[850px]:col-auto">Sobre mim<textarea required maxLength={2000} value={draft.bio} onChange={(event) => onDraftChange({ ...draft, bio: event.target.value })} /></label>
        <fieldset className="col-span-full m-0 flex flex-wrap gap-x-[18px] gap-y-[10px] rounded-[7px] border border-[var(--line)] p-[14px] max-[850px]:col-auto [&>legend]:px-[5px] [&>legend]:text-[11px] [&>legend]:font-bold [&>legend]:text-[#506472] [&_label]:flex [&_label]:items-center [&_label]:gap-[7px] [&_label]:text-xs [&_label]:text-[#506472] [&_input]:w-auto">
          <legend>Áreas de atuação</legend>
          {PROVIDER_CATEGORIES.map((category) => (
            <label key={category}>
              <input type="checkbox" checked={draft.category.includes(category)} onChange={() => onToggleCategory(category)} />
              {category}
            </label>
          ))}
        </fieldset>
        <button className="inline-flex min-h-[42px] items-center justify-center gap-[9px] justify-self-start rounded-lg bg-[var(--navy)] px-[17px] text-xs font-bold text-white disabled:cursor-wait disabled:opacity-[.56]" type="submit" disabled={saving || uploading}>
          {getSaveButtonLabel()}
        </button>
      </div>
    </form>
  );
}