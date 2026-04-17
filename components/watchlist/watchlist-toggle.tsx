"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Star } from "lucide-react";

type WatchlistToggleProps = {
  cardId: string;
  initialWatched: boolean;
};

export function WatchlistToggle({ cardId, initialWatched }: WatchlistToggleProps) {
  const router = useRouter();
  const [isWatched, setIsWatched] = useState(initialWatched);
  const [isPending, startTransition] = useTransition();

  function toggle() {
    startTransition(async () => {
      const method = isWatched ? "DELETE" : "POST";
      const response = await fetch("/api/watchlist", {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ cardId }),
      });

      if (!response.ok) {
        return;
      }

      setIsWatched((current) => !current);
      router.refresh();
    });
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={isPending}
      className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-400 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-70"
    >
      <Star
        className={isWatched ? "fill-amber-400 text-amber-500" : "text-slate-400"}
        size={16}
      />
      {isWatched ? "Watching" : "Add to watchlist"}
    </button>
  );
}
