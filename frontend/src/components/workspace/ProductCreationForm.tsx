import { useEffect, useState, type ChangeEvent, type FormEvent } from "react";
import type { Session } from "@supabase/supabase-js";
import { FiCheckCircle, FiDollarSign, FiImage, FiPackage, FiTag, FiUpload } from "react-icons/fi";
import type { ProductForm } from "../../lib/types";
import { supabase } from "../../lib/supabase";
import WorkspaceCard, { workspaceButtonClass, workspaceFieldClass, workspaceInputClass } from "./WorkspaceCard";

type ProductCreationFormProps = Readonly<{
  session: Session;
  busy: boolean;
  productCategories: string[];
  onCreateProduct: (event: FormEvent<HTMLFormElement>, product: ProductForm & { images?: string[] }) => Promise<boolean>;
}>;

const initialProductForm: ProductForm = { name: "", description: "", price: "", category: "" };
const allowedImageTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
const maxImageBytes = 5 * 1024 * 1024;
const extensionByType: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };

export default function ProductCreationForm({ session, busy, productCategories, onCreateProduct }: ProductCreationFormProps) {
  const [productForm, setProductForm] = useState(initialProductForm);
  const [productImageFile, setProductImageFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!productImageFile) {
      setPreviewUrl(null);
      return;
    }
    const objectUrl = URL.createObjectURL(productImageFile);
    setPreviewUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [productImageFile]);

  function chooseProductImage(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0] ?? null;
    event.currentTarget.value = "";
    if (!file) return;
    if (!allowedImageTypes.has(file.type) || file.size > maxImageBytes) {
      setError("Escolha uma imagem JPEG, PNG ou WebP com até 5 MB.");
      setProductImageFile(null);
      return;
    }
    setError(null);
    setProductImageFile(file);
  }

  async function handleProductSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!productImageFile) {
      setError("Adicione uma fotografia nítida do produto.");
      return;
    }
    if (!supabase) {
      setError("O serviço de fotografias está temporariamente indisponível. Tente novamente mais tarde.");
      return;
    }

    setUploadingImage(true);
    setError(null);
    let filePath: string | null = null;
    try {
      const fileExt = extensionByType[productImageFile.type];
      if (!fileExt || productImageFile.size > maxImageBytes) {
        throw new Error("A fotografia deve ser JPEG, PNG ou WebP e ter até 5 MB.");
      }

      filePath = `${session.user.id}/product-images/${crypto.randomUUID()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage
        .from("products")
        .upload(filePath, productImageFile, { cacheControl: "3600", contentType: productImageFile.type, upsert: false });
      if (uploadError) throw uploadError;

      const imageUrl = supabase.storage.from("products").getPublicUrl(filePath).data.publicUrl;
      const created = await onCreateProduct(event, { ...productForm, images: [imageUrl] });
      if (!created) {
        const { error: cleanupError } = await supabase.storage.from("products").remove([filePath]);
        if (cleanupError) throw new Error(`O produto não foi publicado e a fotografia carregada não pôde ser removida: ${cleanupError.message}`);
        return;
      }

      setProductForm(initialProductForm);
      setProductImageFile(null);
    } catch (submitError) {
      setError(`Não foi possível adicionar o produto: ${(submitError as Error).message}`);
    } finally {
      setUploadingImage(false);
    }
  }

  return (
    <WorkspaceCard
      eyebrow="GESTÃO DA LOJA"
      title="Adicionar um produto"
      description="Mostre o produto com uma boa fotografia e indique claramente o preço."
      icon={FiPackage}
    >
      <form className="grid grid-cols-1 gap-4 min-[851px]:grid-cols-2" onSubmit={(event) => void handleProductSubmit(event)}>
        <label className={workspaceFieldClass}>
          Nome do produto
          <input className={workspaceInputClass} required maxLength={160} placeholder="Ex.: Telefone Samsung Galaxy A14" value={productForm.name} onChange={(event) => setProductForm((current) => ({ ...current, name: event.target.value }))} />
        </label>

        <label className={workspaceFieldClass}>
          <span className="inline-flex items-center gap-1.5"><FiDollarSign aria-hidden="true" /> Preço (MT)</span>
          <input className={workspaceInputClass} required type="number" min="0.01" step="0.01" placeholder="Ex.: 1500.00" value={productForm.price} onChange={(event) => setProductForm((current) => ({ ...current, price: event.target.value }))} />
        </label>

        <label className={`${workspaceFieldClass} min-[851px]:col-span-2`}>
          <span className="inline-flex items-center gap-1.5"><FiTag aria-hidden="true" /> Categoria</span>
          <select className={workspaceInputClass} required value={productForm.category} onChange={(event) => setProductForm((current) => ({ ...current, category: event.target.value }))}>
            <option value="">{productCategories.length ? "Selecione uma categoria da loja" : "A loja ainda não tem categorias registadas"}</option>
            {productCategories.map((category) => <option key={category} value={category}>{category}</option>)}
          </select>
        </label>

        <label className={`${workspaceFieldClass} min-[851px]:col-span-2`}>
          <span className="inline-flex items-center gap-1.5"><FiImage aria-hidden="true" /> Fotografia do produto</span>
          <input className="min-h-11 w-full rounded-lg border border-dashed border-[#b8c9d1] bg-[#f8fafb] p-2 text-xs file:mr-3 file:min-h-8 file:rounded-md file:border-0 file:bg-[var(--navy)] file:px-3 file:text-xs file:font-bold file:text-white" type="file" accept="image/jpeg,image/png,image/webp" required onChange={chooseProductImage} />
          <small className="font-normal text-[var(--muted)]">JPEG, PNG ou WebP · máximo 5 MB.</small>
        </label>

        {previewUrl && <img className="max-h-56 w-full rounded-lg border border-[var(--line)] bg-[#f8fafb] object-contain min-[851px]:col-span-2" src={previewUrl} alt="Pré-visualização do produto" />}

        <label className={`${workspaceFieldClass} min-[851px]:col-span-2`}>
          Detalhes do produto
          <textarea className={`${workspaceInputClass} min-h-28 resize-y`} required maxLength={4000} placeholder="Descreva o estado, cor, tamanho ou garantias do artigo." value={productForm.description} onChange={(event) => setProductForm((current) => ({ ...current, description: event.target.value }))} />
        </label>

        {error && <p className="m-0 rounded-lg bg-[#fff0ec] p-3 text-xs text-[#9e3b2e] min-[851px]:col-span-2" role="alert">{error}</p>}

        <button className={`${workspaceButtonClass} min-[851px]:col-span-2`} type="submit" disabled={busy || uploadingImage}>
          {uploadingImage ? <FiUpload aria-hidden="true" /> : <FiCheckCircle aria-hidden="true" />}
          {uploadingImage ? "A carregar e publicar..." : "Adicionar produto à loja"}
        </button>
      </form>
    </WorkspaceCard>
  );
}
