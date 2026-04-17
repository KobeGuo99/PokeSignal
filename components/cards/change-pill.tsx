import { clsx } from "clsx";

import { formatPercent } from "@/lib/utils/format";

export function ChangePill({ value }: { value: number | null | undefined }) {
  const isPositive = (value ?? 0) >= 0;

  return (
    <span
      className={clsx(
        "inline-flex rounded-full px-2.5 py-1 text-xs font-semibold",
        value === null || value === undefined
          ? "bg-slate-100 text-slate-500"
          : isPositive
            ? "bg-emerald-50 text-emerald-700"
            : "bg-rose-50 text-rose-700",
      )}
    >
      {formatPercent(value)}
    </span>
  );
}
