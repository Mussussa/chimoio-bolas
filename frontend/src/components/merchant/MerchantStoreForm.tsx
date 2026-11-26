import { useEffect, useState, type FormEvent, type ChangeEvent } from "react";
import { 
  FiShoppingBag, 
  FiLink, 
  FiMapPin, 
  FiFileText, 
  FiUpload, 
  FiTrash2, 
  FiCheck, 
  FiAlertCircle,
  FiGrid
} from "react-icons/fi";
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
    <form className="mt-0.5 min-w-0 rounded-lg border border-[var(--line)] bg-white p-[17px]" onSubmit={onSubmit}>
      <div className="mb-4 flex items-center justify-between gap-[14px]">
        <div>
          <h2 className="m-0 font-[Manrope,sans-serif] text-lg font-bold text-[var(--navy)]">Dados da loja</h2>
          <p className="mt-[7px] text-xs leading-[1.6] text-[var(--muted)]">Mantenha as informações públicas atualizadas.</p>
        </div>
      </div>
      
      <div className="grid grid-cols-1 gap-[14px] min-[851px]:grid-cols-2 [&>label]:grid [&>label]:gap-[7px] [&>label]:text-[11px] [&>label]:font-bold [&>label]:text-[#506472]">
        
        {/* Secção do Logótipo */}
        <div className="col-span-full grid gap-3 rounded-lg border border-[var(--line)] bg-[#f9fbfc] p-4 max-[850px]:col-auto">
          <div className="flex items-center gap-[14px]">
            {logoPreview || draft.logoUrl
              ? <img className="h-16 w-16 flex-none rounded-lg border border-[var(--line)] bg-[#f5f8f9] object-cover" src={logoPreview ?? draft.logoUrl} alt="Pré-visualização do logótipo" />
              : <span className="grid h-16 w-16 flex-none place-items-center rounded-lg bg-[var(--blue)] font-[Manrope,sans-serif] text-2xl font-bold text-white shadow-sm" aria-hidden="true">{draft.name.slice(0, 1).toLocaleUpperCase() || "L"}</span>}
            <div>
              <strong className="text-[13px] text-[var(--navy)]">Logótipo da loja</strong>
              <p className="mt-[5px] text-[11px] text-[var(--muted)]">JPEG, PNG ou WebP, até 5 MB.</p>
            </div>
          </div>
          
          <label className="grid gap-[7px] text-[11px] font-bold text-[#506472]">
            <span className="inline-flex items-center gap-1.5"><FiUpload size={13} className="text-[var(--blue)]" /> Selecionar imagem</span>
            <input className="text-xs text-[#506472] file:mr-3 file:rounded-md file:border-0 file:bg-[var(--navy)] file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-white" type="file" accept="image/jpeg,image/png,image/webp" onChange={chooseLogo} />
          </label>

          <div className="flex flex-wrap items-center gap-3">
            <button type="button" className="inline-flex min-h-[42px] items-center justify-center gap-[9px] rounded-lg border border-[#c8d6dd] bg-white px-[17px] text-xs font-bold text-[var(--navy)] hover:bg-[#f1f5f8] disabled:cursor-wait disabled:opacity-[.56]" onClick={() => void uploadLogo()} disabled={!logoFile || uploadingLogo || saving}>
              <FiUpload size={14} />
              {uploadingLogo ? "A carregar logótipo..." : "Carregar logótipo"}
            </button>
            {draft.logoUrl && (
              <button type="button" className="inline-flex items-center gap-1.5 border-0 bg-transparent text-xs font-bold text-[#dc2626] hover:underline" onClick={() => onFieldChange("logoUrl", "")}>
                <FiTrash2 size={14} /> Remover logótipo
              </button>
            )}
          </div>

          {logoError && (
            <div className="flex items-center gap-2 rounded-md bg-[#fff0ec] px-3 py-2 text-xs text-[#9e3b2e]" role="alert">
              <FiAlertCircle size={15} className="shrink-0" />
              <span>{logoError}</span>
            </div>
          )}
        </div>

        {/* Nome da Loja */}
        <label>
          <span className="inline-flex items-center gap-1.5"><FiShoppingBag size={13} className="text-[var(--blue)]" /> Nome da loja</span>
          <input required maxLength={160} value={draft.name} onChange={(event) => onFieldChange("name", event.target.value)} placeholder="Ex: Loja Central Chimoio" />
        </label>

        {/* Endereço Web / Slug */}
        <label>
          <span className="inline-flex items-center gap-1.5"><FiLink size={13} className="text-[var(--blue)]" /> Endereço web (slug)</span>
          <input required maxLength={180} pattern="[a-z0-9]+(?:-[a-z0-9]+)*" value={draft.slug} onChange={(event) => onFieldChange("slug", event.target.value)} placeholder="ex: loja-central-chimoio" />
        </label>

        {/* Endereço Físico */}
        <label className="col-span-full max-[850px]:col-auto">
          <span className="inline-flex items-center gap-1.5"><FiMapPin size={13} className="text-[var(--blue)]" /> Endereço ou Bairro em Chimoio</span>
          <input required maxLength={500} value={draft.address} onChange={(event) => onFieldChange("address", event.target.value)} placeholder="Ex: Av. 25 de Setembro, Bairro Centro" />
        </label>

        {/* Descrição */}
        <label className="col-span-full max-[850px]:col-auto">
          <span className="inline-flex items-center gap-1.5"><FiFileText size={13} className="text-[var(--blue)]" /> Descrição</span>
          <textarea required rows={3} maxLength={4000} value={draft.description} onChange={(event) => onFieldChange("description", event.target.value)} placeholder="Descreva os produtos e serviços que a sua loja oferece..." />
        </label>

        {/* Categorias */}
        <fieldset className="col-span-full m-0 flex flex-wrap gap-x-[18px] gap-y-[10px] rounded-[7px] border border-[var(--line)] p-[14px] max-[850px]:col-auto [&>legend]:px-[5px] [&>legend]:text-[11px] [&>legend]:font-bold [&>legend]:text-[#506472] [&_label]:flex [&_label]:items-center [&_label]:gap-[7px] [&_label]:text-xs [&_label]:text-[#506472] [&_input]:w-auto">
          <legend className="inline-flex items-center gap-1.5">
            <FiGrid size={13} className="text-[var(--blue)]" /> Categorias
          </legend>
          {STORE_CATEGORIES.map((category) => (
            <label key={category} className="cursor-pointer select-none">
              <input type="checkbox" checked={draft.category.includes(category)} onChange={() => onToggleCategory(category)} className="accent-[var(--navy)]" />
              <span>{category}</span>
            </label>
          ))}
        </fieldset>

        {/* Botão de Guardar */}
        <button className="inline-flex min-h-[42px] items-center justify-center gap-[9px] justify-self-start rounded-lg bg-[var(--navy)] px-[17px] text-xs font-bold text-white hover:bg-[#16354add] disabled:cursor-wait disabled:opacity-[.56]" type="submit" disabled={saving || uploadingLogo}>
          <FiCheck size={15} />
          {saving ? "A guardar..." : "Guardar alterações"}
        </button>
      </div>
    </form>
  );
}