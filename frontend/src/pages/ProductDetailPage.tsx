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

  if (error) return <section className="section"><p className="empty">{error} <Link to="/">Voltar ao catálogo</Link></p></section>;
  return <section className="section"><p className="empty">A abrir a loja e a destacar o produto...</p></section>;
}
