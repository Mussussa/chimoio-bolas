import { useEffect, useState, type FormEvent, type ChangeEvent } from "react";
import type { MerchantStoreDraft } from "./merchantTypes";
import { STORE_CATEGORIES } from "./merchantTypes";

type StoreTextField = Exclude<keyof MerchantStoreDraft, "category">;

type MerchantStoreFormProps = Readonly<{
  draft: MerchantStoreDraft;
  saving: boolean;
  uploadingLogo: boolean;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onFieldChange: (field: StoreTextField, value: string) => void;
  onToggleCategory: (category: string) => void;
  onUploadLogo: (file: File) => Promise<string>;
}>;

const MAX_LOGO_BYTES = 5 * 1024 * 1024;
const LOGO_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

export default function MerchantStoreForm({
  draft,
  saving,
  uploadingLogo,
  onSubmit,
  onFieldChange,
  onToggleCategory,
  onUploadLogo
}: MerchantStoreFormProps) {
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [logoError, setLogoError] = useState<string | null>(null);

  useEffect(() => {
    if (!logoFile) {
      setLogoPreview(null);
      return;
    }
    const previewUrl = URL.createObjectURL(logoFile);
    setLogoPreview(previewUrl);
    return () => URL.revokeObjectURL(previewUrl);
  }, [logoFile]);

  function chooseLogo(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!LOGO_TYPES.has(file.type)) {
      setLogoError("Escolha uma imagem JPEG, PNG ou WebP.");
      event.target.value = "";
      return;
    }
    if (file.size > MAX_LOGO_BYTES) {
      setLogoError("O logótipo deve ter no máximo 5 MB.");
      event.target.value = "";
      return;
    }
    setLogoError(null);
    setLogoFile(file);
  }

  async function uploadLogo() {
    if (!logoFile) return;
    setLogoError(null);
    try {
      const logoUrl = await onUploadLogo(logoFile);
      onFieldChange("logoUrl", logoUrl);
      setLogoFile(null);
    } catch (error) {
      setLogoError((error as Error).message);
    }
  }

  return (
    <form className="merchant-panel merchant-form" onSubmit={onSubmit}>
      <div className="merchant-panel-heading">
        <div><h2>Dados da loja</h2><p>Mantenha as informações públicas atualizadas.</p></div>
      </div>
      <div className="form-grid">
        <div className="merchant-logo-field wide">
          <div className="merchant-logo-preview">
            {logoPreview || draft.logoUrl
              ? <img className="merchant-store-logo" src={logoPreview ?? draft.logoUrl} alt="Pré-visualização do logótipo" />
              : <span className="merchant-logo-placeholder" aria-hidden="true">{draft.name.slice(0, 1).toLocaleUpperCase() || "L"}</span>}
            <div>
              <strong>Logótipo da loja</strong>
              <p>JPEG, PNG ou WebP, até 5 MB.</p>
            </div>
          </div>
          <label className="merchant-logo-file">
            <span>Selecionar imagem</span>
            <input type="file" accept="image/jpeg,image/png,image/webp" onChange={chooseLogo} />
          </label>
          <div className="merchant-logo-actions">
            <button type="button" className="button button-outline" onClick={() => void uploadLogo()} disabled={!logoFile || uploadingLogo || saving}>
              {uploadingLogo ? "A carregar logótipo..." : "Carregar logótipo"}
            </button>
            {draft.logoUrl && <button type="button" className="link-button" onClick={() => onFieldChange("logoUrl", "")}>Remover logótipo</button>}
          </div>
          {logoError && <p className="merchant-feedback is-error" role="alert">{logoError}</p>}
        </div>

        <label>Nome da loja<input required maxLength={160} value={draft.name} onChange={(event) => onFieldChange("name", event.target.value)} /></label>
        <label>Endereço web<input required maxLength={180} pattern="[a-z0-9]+(?:-[a-z0-9]+)*" value={draft.slug} onChange={(event) => onFieldChange("slug", event.target.value)} /></label>
        <label className="wide">Endereço<input required maxLength={500} value={draft.address} onChange={(event) => onFieldChange("address", event.target.value)} /></label>
        <label className="wide">Descrição<textarea required maxLength={4000} value={draft.description} onChange={(event) => onFieldChange("description", event.target.value)} /></label>
        <label>Latitude<input type="number" step="any" value={draft.latitude} onChange={(event) => onFieldChange("latitude", event.target.value)} /></label>
        <label>Longitude<input type="number" step="any" value={draft.longitude} onChange={(event) => onFieldChange("longitude", event.target.value)} /></label>
        <fieldset className="merchant-categories wide">
          <legend>Categorias</legend>
          {STORE_CATEGORIES.map((category) => (
            <label key={category}>
              <input type="checkbox" checked={draft.category.includes(category)} onChange={() => onToggleCategory(category)} />
              {category}
            </label>
          ))}
        </fieldset>
        <button className="button button-dark" type="submit" disabled={saving || uploadingLogo}>
          {saving ? "A guardar..." : "Guardar alterações"}
        </button>
      </div>
    </form>
  );
}