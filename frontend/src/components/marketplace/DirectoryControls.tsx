import { Link, useLocation } from "react-router-dom";

const catalogPages = [
  { path: "/", label: "Tudo" },
  { path: "/produtos", label: "Produtos" },
  { path: "/servicos", label: "Serviços" },
  { path: "/lojas", label: "Lojas" }
];

export function CatalogNavigation() {
  const { pathname } = useLocation();

  return (
    <nav className="catalog-tabs" aria-label="Categorias do catálogo">
      {catalogPages.map(({ path, label }) => (
        <Link
          key={path}
          to={path}
          className={pathname === path ? "is-active" : ""}
          aria-current={pathname === path ? "page" : undefined}
        >
          {label}
        </Link>
      ))}
    </nav>
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
    <div className="directory-filters">
      <label>
        <span className="visually-hidden">{searchLabel}</span>
        <input
          type="search"
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder={searchLabel}
        />
      </label>
      <label>
        <span className="visually-hidden">Filtrar por categoria</span>
        <select value={category} onChange={(event) => onCategoryChange(event.target.value)}>
          <option value="">Todas as categorias</option>
          {categories.map((item) => <option key={item} value={item}>{item}</option>)}
        </select>
      </label>
    </div>
  );
}
