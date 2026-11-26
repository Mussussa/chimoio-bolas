import type { ReactNode } from "react";
import type { IconType } from "react-icons";

type WorkspaceCardProps = Readonly<{
  eyebrow: string;
  title: string;
  description: string;
  icon: IconType;
  children: ReactNode;
}>;

export default function WorkspaceCard({
  eyebrow,
  title,
  description,
  icon: Icon,
  children
}: WorkspaceCardProps) {
  return (
    <article className="min-w-0 overflow-hidden rounded-xl border border-[var(--line)] bg-white shadow-[0_8px_18px_#16354a08]">
      <header className="flex items-start gap-3 border-b border-[var(--line)] bg-[#f8fafb] p-4 min-[561px]:gap-4 min-[561px]:p-6">
        <span className="grid h-11 w-11 flex-none place-items-center rounded-xl bg-[var(--yellow-soft)] text-[var(--navy)] min-[561px]:h-12 min-[561px]:w-12" aria-hidden="true">
          <Icon size={21} />
        </span>
        <div className="min-w-0">
          <p className="mb-1 text-[9px] font-extrabold tracking-[.15em] text-[var(--blue)] min-[561px]:text-[10px]">{eyebrow}</p>
          <h2 className="m-0 font-[Manrope,sans-serif] text-lg font-extrabold leading-tight text-[var(--navy)] min-[561px]:text-xl">{title}</h2>
          <p className="mb-0 mt-1.5 text-xs leading-relaxed text-[var(--muted)] min-[561px]:text-[13px]">{description}</p>
        </div>
      </header>
      <div className="p-4 min-[561px]:p-6">
        {children}
      </div>
    </article>
  );
}

export const workspaceFieldClass = "grid min-w-0 gap-1.5 text-xs font-bold text-[#506472]";
export const workspaceInputClass = "min-h-11 w-full min-w-0 rounded-lg border border-[#c8d6dd] bg-white px-3 py-2 text-sm font-normal text-[var(--navy)] outline-none transition focus:border-[var(--blue)] focus:ring-2 focus:ring-[var(--blue)]/15";
export const workspaceButtonClass = "inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-[var(--navy)] px-4 py-2 text-sm font-bold text-white transition hover:bg-[var(--blue)] disabled:cursor-wait disabled:opacity-60 min-[561px]:w-auto";
