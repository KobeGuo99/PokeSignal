import Image from "next/image";
import Link from "next/link";

import { ChangePill } from "@/components/cards/change-pill";
import { SignalBadge } from "@/components/cards/signal-badge";
import { WatchlistToggle } from "@/components/watchlist/watchlist-toggle";
import { Panel } from "@/components/ui/panel";
import type { SignalCardView } from "@/lib/data/queries";
import { formatCurrency } from "@/lib/utils/format";

type RankingTableProps = {
  title: string;
  subtitle: string;
  rows: SignalCardView[];
};

export function RankingTable({ title, subtitle, rows }: RankingTableProps) {
  return (
    <Panel title={title} subtitle={subtitle}>
      {rows.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-300 bg-white/70 px-6 py-10 text-center text-sm text-slate-600">
          No cards match this slice yet.
        </div>
      ) : (
        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase tracking-[0.2em] text-slate-500">
                <tr>
                  <th className="px-4 py-3">Card</th>
                  <th className="px-4 py-3">Signal</th>
                  <th className="px-4 py-3">Price</th>
                  <th className="px-4 py-3">1d</th>
                  <th className="px-4 py-3">7d</th>
                  <th className="px-4 py-3">30d</th>
                  <th className="px-4 py-3">Confidence</th>
                  <th className="px-4 py-3">Watch</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {rows.map((row) => (
                  <tr key={row.id} className="align-top">
                    <td className="px-4 py-4">
                      <div className="flex min-w-[280px] items-start gap-3">
                        {row.imageUrl ? (
                          <Image
                            alt={row.name}
                            className="h-16 w-12 rounded-xl border border-slate-200 bg-slate-50 object-cover"
                            src={row.imageUrl}
                            width={48}
                            height={64}
                          />
                        ) : (
                          <div className="h-16 w-12 rounded-xl border border-slate-200 bg-slate-50" />
                        )}
                        <div>
                          <Link href={`/cards/${row.id}`} className="font-semibold text-slate-900 hover:text-teal-700">
                            {row.name}
                          </Link>
                          <p className="text-slate-600">{row.setName}</p>
                          <p className="text-xs text-slate-500">{row.rarity ?? "Rarity unknown"}</p>
                          <p className="mt-2 max-w-md text-xs text-slate-600">{row.explanation}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <SignalBadge category={row.category} />
                    </td>
                    <td className="px-4 py-4 font-semibold text-slate-900">
                      {formatCurrency(row.currentPrice, row.currency ?? undefined)}
                      <p className="mt-1 text-xs font-normal text-slate-500">
                        {row.priceProvider === "tcgplayer" ? "TCGplayer market" : "Fallback market"}
                      </p>
                    </td>
                    <td className="px-4 py-4">
                      <ChangePill value={row.change1d} />
                    </td>
                    <td className="px-4 py-4">
                      <ChangePill value={row.change7d} />
                    </td>
                    <td className="px-4 py-4">
                      <ChangePill value={row.change30d} />
                    </td>
                    <td className="px-4 py-4 text-slate-700">
                      {row.confidence ? `${(row.confidence * 100).toFixed(0)}%` : "N/A"}
                    </td>
                    <td className="px-4 py-4">
                      <WatchlistToggle cardId={row.id} initialWatched={row.isWatchlisted} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </Panel>
  );
}
