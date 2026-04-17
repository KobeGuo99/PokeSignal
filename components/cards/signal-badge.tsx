import { RecommendationCategory } from "@prisma/client";
import { clsx } from "clsx";

const styles: Record<RecommendationCategory, string> = {
  STRONG_BUY_DIP: "bg-teal-50 text-teal-800 ring-teal-200",
  WATCH: "bg-amber-50 text-amber-800 ring-amber-200",
  AVOID: "bg-red-50 text-red-800 ring-red-200",
  MOMENTUM_BUY: "bg-orange-50 text-orange-800 ring-orange-200",
};

const labels: Record<RecommendationCategory, string> = {
  STRONG_BUY_DIP: "Strong Buy Dip",
  WATCH: "Watch",
  AVOID: "Avoid",
  MOMENTUM_BUY: "Momentum Buy",
};

export function SignalBadge({ category }: { category: RecommendationCategory }) {
  return (
    <span
      className={clsx(
        "inline-flex rounded-full px-3 py-1 text-xs font-semibold ring-1 ring-inset",
        styles[category],
      )}
    >
      {labels[category]}
    </span>
  );
}
