import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { loadPublicProduct } from "../lib/api";
import { storeProductHref } from "../lib/publicLinks";

export default function ProductDetailPage() {
  const { productId = "" } = useParams();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setError(null);
    void loadPublicProduct(productId)
      .then((result) => {
        if (active) {
          void navigate(storeProductHref(result.store.slug, result.product.id), { replace: true });
        }
      })
      .catch((loadError: Error) => { if (active) setError(loadError.message); });
    return () => { active = false; };
  }, [navigate, productId]);

  if (error) return <section className="px-[clamp(20px,7vw,100px)] py-[70px] max-[560px]:py-12"><p className="col-span-full rounded-[10px] border border-dashed border-[#cbd8de] p-6 text-center text-[13px] text-[#716e60]">{error} <Link className="font-bold text-[#765900] underline" to="/">Voltar ao catálogo</Link></p></section>;
  return <section className="px-[clamp(20px,7vw,100px)] py-[70px] max-[560px]:py-12"><p className="col-span-full rounded-[10px] border border-dashed border-[#cbd8de] p-6 text-center text-[13px] text-[#716e60]">A abrir a loja e a destacar o produto...</p></section>;
}
