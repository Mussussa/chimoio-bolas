import { useEffect, useState, type ChangeEvent, type FormEvent } from "react";
import type { ProviderProfileDraft } from "./providerTypes";
import { PROVIDER_CATEGORIES } from "./providerTypes";

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
    <form className="provider-panel provider-profile-form" onSubmit={submit}>
      <header className="provider-panel-heading">
        <div><p className="eyebrow">PERFIL PROFISSIONAL</p><h2>Apresente o seu trabalho</h2></div>
      </header>
      <div className="provider-avatar-field">
        {previewUrl || avatarUrl
          ? <img className="provider-avatar" src={previewUrl ?? avatarUrl ?? ""} alt="Fotografia de perfil" />
          : <span className="provider-avatar provider-avatar-placeholder" aria-hidden="true">{draft.name.slice(0, 1).toLocaleUpperCase() || "P"}</span>}
        <label>
          <span>Fotografia de perfil</span>
          <input type="file" accept="image/jpeg,image/png,image/webp" onChange={chooseAvatar} />
          <small>JPEG, PNG ou WebP, até 5 MB.</small>
        </label>
      </div>
      {photoError && <p className="provider-inline-error" role="alert">{photoError}</p>}
      <div className="form-grid">
        <label>Nome público<input required maxLength={120} value={draft.name} onChange={(event) => onDraftChange({ ...draft, name: event.target.value })} /></label>
        <label>Preço-base ou visita (MT)<input required type="number" min="0" step="0.01" value={draft.basePrice} onChange={(event) => onDraftChange({ ...draft, basePrice: event.target.value })} /></label>
        <label className="wide">Sobre mim<textarea required maxLength={2000} value={draft.bio} onChange={(event) => onDraftChange({ ...draft, bio: event.target.value })} /></label>
        <fieldset className="provider-category-field wide">
          <legend>Áreas de atuação</legend>
          {PROVIDER_CATEGORIES.map((category) => (
            <label key={category}>
              <input type="checkbox" checked={draft.category.includes(category)} onChange={() => onToggleCategory(category)} />
              {category}
            </label>
          ))}
        </fieldset>
        <button className="button button-dark" type="submit" disabled={saving || uploading}>
          {getSaveButtonLabel()}
        </button>
      </div>
    </form>
  );
}