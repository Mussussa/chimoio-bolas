import { Link, useLocation } from "react-router-dom";
import { FiMapPin, FiNavigation } from "react-icons/fi";
import { CHIMOIO_NEIGHBORHOODS } from "../../lib/chimoioNeighborhoods";
import { DEFAULT_NEIGHBORHOOD } from "../../lib/locationPreference";

const catalogPages = [
  { path: "/", label: "Tudo" },
  { path: "/produtos", label: "Produtos" },
  { path: "/servicos", label: "Serviços" },
  { path: "/lojas", label: "Lojas" }
];

export function CatalogNavigation() {
  const { pathname } = useLocation();

  return (
    <nav className="mb-[22px] mt-[-8px] flex flex-wrap gap-2" aria-label="Categorias do catálogo">
      {catalogPages.map(({ path, label }) => (
        <Link
          key={path}
          to={path}
          className={`inline-flex min-h-[38px] items-center rounded-full border px-[15px] text-xs font-bold ${pathname === path ? "border-[var(--navy)] bg-[var(--navy)] text-white" : "border-[var(--line)] bg-white text-[#526674]"}`}
          aria-current={pathname === path ? "page" : undefined}
        >
          {label}
        </Link>
      ))}
    </nav>
  );
}

type LocationPreferenceProps = Readonly<{
  neighborhood: string;
  gpsActive: boolean;
  onNeighborhoodChange: (neighborhood: string) => void;
  onLocate: () => void;
}>;

export function LocationPreference({
  neighborhood,
  gpsActive,
  onNeighborhoodChange,
  onLocate
}: LocationPreferenceProps) {
  return (
    <div className="mb-6 flex flex-wrap items-center gap-x-3 gap-y-2 rounded-xl border border-[#e7e1ca] bg-white px-4 py-3 text-xs shadow-[0_4px_14px_#16354a08]">
      <span className="inline-flex items-center gap-2 font-semibold text-[#536978]" aria-live="polite">
        <FiMapPin aria-hidden="true" className="text-[#9a7200]" />
        A ver artigos em:
      </span>
      <label className="min-w-[190px] flex-1">
        <span className="sr-only">Bairro selecionado</span>
        <select
          className="min-h-[38px] w-full border-0 bg-transparent py-1 font-bold text-[#302b18] focus:ring-0"
          value={gpsActive ? "" : neighborhood}
          onChange={(event) => onNeighborhoodChange(event.target.value)}
        >
          {gpsActive && <option value="">Localização atual do dispositivo</option>}
          {CHIMOIO_NEIGHBORHOODS.map((item) => (
            <option key={item.name} value={item.name}>
              {item.name === DEFAULT_NEIGHBORHOOD ? "Chimoio (Centro)" : item.name}
            </option>
          ))}
        </select>
      </label>
      <button
        className="inline-flex min-h-[38px] items-center justify-center gap-2 rounded-lg border border-[#c8d6dd] bg-[#f7fafb] px-3 font-bold text-[var(--navy)] transition-colors hover:bg-[#fff7d6]"
        type="button"
        onClick={onLocate}
      >
        <FiNavigation aria-hidden="true" />
        Afinar com GPS
      </button>
    </div>
  );
}

type DirectoryFiltersProps = Readonly<{
  query: string;
  onQueryChange: (value: string) => void;
  category: string;
  categories: string[];
  onCategoryChange: (value: string) => void;
  searchLabel: string;
}>;

export function DirectoryFilters({
  query,
  onQueryChange,
  category,
  categories,
  onCategoryChange,
  searchLabel
}: DirectoryFiltersProps) {
  return (
    <div className="mb-[22px] grid grid-cols-1 gap-[10px] min-[851px]:grid-cols-[minmax(0,1fr)_minmax(200px,280px)]">
      <label>
        <span className="sr-only">{searchLabel}</span>
        <input
          type="search"
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder={searchLabel}
        />
      </label>
      <label>
        <span className="sr-only">Filtrar por categoria</span>
        <select value={category} onChange={(event) => onCategoryChange(event.target.value)}>
          <option value="">Todas as categorias</option>
          {categories.map((item) => <option key={item} value={item}>{item}</option>)}
        </select>
      </label>
    </div>
  );
}
