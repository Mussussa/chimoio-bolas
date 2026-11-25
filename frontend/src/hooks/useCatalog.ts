import { useCallback, useMemo, useState } from "react";
import { loadCatalog as fetchCatalog } from "../lib/api";
import type { Catalog, Notice } from "../lib/types";
import type { Dispatch, SetStateAction } from "react";

const emptyCatalog: Catalog = { stores: [], mapStores: [], products: [], providers: [], services: [], providerReviews: [] };

export default function useCatalog(setNotice: Dispatch<SetStateAction<Notice>>) {
  const [catalog, setCatalog] = useState<Catalog>(emptyCatalog);
  const [catalogStatus, setCatalogStatus] = useState<"loading" | "ready" | "error">("loading");
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [nearby, setNearby] = useState(false);
  const [coordinates, setCoordinates] = useState<[number, number] | null>(null);

  const loadCatalog = useCallback(async () => {
    setCatalogStatus("loading");
    setCatalogError(null);
    try {
      setCatalog(await fetchCatalog());
      setCatalogStatus("ready");
    } catch (error) {
      console.error("Catalog load failed", error);
      const message = "Não foi possível carregar as ofertas agora. Tenta novamente mais tarde.";
      setCatalogError(message);
      setCatalogStatus("error");
      setNotice({ text: message, error: true });
    }
  }, [setNotice]);

  const providerIds = useMemo(() => new Set(catalog.providers.map((provider) => provider.id)), [catalog.providers]);
  const visibleProducts = useMemo(() => {
    const term = search.trim().toLocaleLowerCase();
    return catalog.products.filter((product) => !term || `${product.name} ${product.description} ${product.category}`.toLocaleLowerCase().includes(term));
  }, [catalog.products, search]);
  const visibleServices = useMemo(() => catalog.services.filter((service) => {
    const provider = catalog.providers.find((item) => item.id === service.provider_id);
    const term = search.trim().toLocaleLowerCase();
    return providerIds.has(service.provider_id) && (!term || `${service.title} ${service.description} ${service.category ?? ""} ${provider?.category ?? ""}`.toLocaleLowerCase().includes(term));
  }), [catalog.providers, catalog.services, providerIds, search]);

  const locate = useCallback(() => {
    if (!navigator.geolocation) {
      setNotice({ text: "GPS não está disponível neste dispositivo.", error: true });
      return;
    }
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => { setCoordinates([coords.latitude, coords.longitude]); setNearby(true); },
      () => setNotice({ text: "Não foi possível obter a localização. Verifica a permissão de GPS.", error: true }),
      { enableHighAccuracy: true, maximumAge: 60_000, timeout: 10_000 }
    );
  }, [setNotice]);

  return {
    catalog,
    setCatalog,
    catalogStatus,
    catalogError,
    search,
    setSearch,
    nearby,
    setNearby,
    coordinates,
    setCoordinates,
    visibleProducts,
    visibleServices,
    loadCatalog,
    locate
  };
}
