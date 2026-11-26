import { lazy, Suspense } from "react";
import type { ComponentProps } from "react";

const MapExplorer = lazy(() => import("./MapExplorer"));

export default function LazyMapExplorer(props: ComponentProps<typeof MapExplorer>) {
  return (
    <Suspense fallback={
      <div className="my-[10px] grid h-[360px] place-items-center rounded-xl border border-[var(--line)] bg-[#e6edf0] text-sm text-[var(--muted)]" role="status">
        A carregar o mapa…
      </div>
    }>
      <MapExplorer {...props} />
    </Suspense>
  );
}
