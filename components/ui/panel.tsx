import type { ReactNode } from "react";

import { clsx } from "clsx";

type PanelProps = {
  title?: string;
  subtitle?: string;
  children?: ReactNode;
  className?: string;
};

export function Panel({ title, subtitle, children, className }: PanelProps) {
  return (
    <section className={clsx("panel rounded-[28px] p-5", className)}>
      {(title || subtitle) && (
        <div className="mb-4">
          {title && <h2 className="font-display text-xl font-semibold tracking-tight">{title}</h2>}
          {subtitle && <p className="mt-1 text-sm text-slate-600">{subtitle}</p>}
        </div>
      )}
      {children ?? null}
    </section>
  );
}
