import { RecommendationCategory } from "@prisma/client";
import Image from "next/image";
import { notFound } from "next/navigation";

import { ChangePill } from "@/components/cards/change-pill";
import { SignalBadge } from "@/components/cards/signal-badge";
import { PriceHistoryChart } from "@/components/charts/price-history-chart";
import { Panel } from "@/components/ui/panel";
import { WatchlistToggle } from "@/components/watchlist/watchlist-toggle";
import { getCardDetail } from "@/lib/data/queries";
import { formatCurrency, formatPercent } from "@/lib/utils/format";

export const dynamic = "force-dynamic";

export default async function CardDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const data = await getCardDetail(id);

  if (!data) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <section className="signal-grid items-start">
        <Panel className="p-6">
          <div className="flex flex-col gap-6 md:flex-row">
            {data.card.imageLargeUrl ? (
              <Image
                src={data.card.imageLargeUrl}
                alt={data.card.name}
                className="w-full max-w-[260px] rounded-[28px] border border-slate-200 bg-white object-cover"
                width={260}
                height={364}
              />
            ) : null}
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-3">
                <SignalBadge category={data.latestRecommendation?.category ?? RecommendationCategory.WATCH} />
                <WatchlistToggle cardId={data.card.id} initialWatched={data.isWatchlisted} />
              </div>
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.25em] text-teal-700">
                  {data.card.setName}
                </p>
                <h1 className="font-display mt-2 text-4xl font-semibold tracking-tight">{data.card.name}</h1>
                <p className="mt-2 text-slate-600">
                  {data.card.rarity ?? "Rarity unknown"} • #{data.card.number ?? "N/A"}
                </p>
              </div>
              <div className="grid gap-4 md:grid-cols-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Current price</p>
                  <p className="mt-1 text-2xl font-semibold">
                    {formatCurrency(
                      data.latestFeature?.currentPrice,
                      data.displayCurrency ?? undefined,
                    )}
                  </p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-500">1d</p>
                  <div className="mt-1">
                    <ChangePill value={data.latestFeature?.change1d} />
                  </div>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-500">7d</p>
                  <div className="mt-1">
                    <ChangePill value={data.latestFeature?.change7d} />
                  </div>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-500">30d</p>
                  <div className="mt-1">
                    <ChangePill value={data.latestFeature?.change30d} />
                  </div>
                </div>
              </div>
              <p className="max-w-3xl text-sm text-slate-700">
                {data.latestRecommendation?.explanation ?? "No recommendation snapshot is available yet."}
              </p>
              <p className="text-xs text-slate-500">
                Latest stored market snapshot: {data.latestPriceSnapshot?.priceDate.toISOString().slice(0, 10) ?? "N/A"}{" "}
                {data.convertedFromCurrency && data.eurToUsdRate
                  ? `(displayed in USD from ${data.convertedFromCurrency} at ${data.eurToUsdRate.toFixed(4)} EUR/USD)`
                  : data.displayCurrency
                    ? `(${data.displayCurrency})`
                    : ""}
              </p>
            </div>
          </div>
        </Panel>
        <Panel title="Current feature snapshot" subtitle="The rule engine and model both read from this normalized view.">
          <dl className="grid gap-3 text-sm text-slate-700">
            <div className="flex justify-between gap-4">
              <dt>Confidence</dt>
              <dd>{data.latestRecommendation ? `${(data.latestRecommendation.confidence ?? 0) * 100}%` : "N/A"}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt>Rule score</dt>
              <dd>{data.latestRecommendation?.ruleScore?.toFixed(2) ?? "N/A"}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt>Continuation probability</dt>
              <dd>{data.latestRecommendation?.modelScore ? formatPercent(data.latestRecommendation.modelScore) : "Model off / unavailable"}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt>Volatility 7d</dt>
              <dd>{formatPercent(data.latestFeature?.volatility7d)}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt>SMA 7</dt>
              <dd>{formatCurrency(data.latestFeature?.sma7, data.displayCurrency ?? undefined)}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt>SMA 30</dt>
              <dd>{formatCurrency(data.latestFeature?.sma30, data.displayCurrency ?? undefined)}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt>Trend slope 7d</dt>
              <dd>{data.latestFeature?.trendSlope7d?.toFixed(4) ?? "N/A"}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt>Drawdown from 30d peak</dt>
              <dd>{formatPercent(data.latestFeature?.drawdownFromPeak30d)}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt>Data quality</dt>
              <dd>{formatPercent(data.latestFeature?.dataQualityScore)}</dd>
            </div>
          </dl>
        </Panel>
      </section>

      <Panel title="Price history" subtitle="Daily stored market snapshots.">
        <PriceHistoryChart
          data={data.priceHistory}
          currency={data.displayCurrency ?? undefined}
        />
      </Panel>

      <Panel title="Daily snapshots" subtitle="Stored history used for features and recommendation snapshots.">
        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase tracking-[0.2em] text-slate-500">
                <tr>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Market price</th>
                  <th className="px-4 py-3">Low</th>
                  <th className="px-4 py-3">High</th>
                  <th className="px-4 py-3">Source</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {data.priceHistory.slice().reverse().map((snapshot) => (
                  <tr key={`${snapshot.source}-${snapshot.priceDate}`}>
                    <td className="px-4 py-3">{snapshot.priceDate}</td>
                    <td className="px-4 py-3">{formatCurrency(snapshot.marketPrice, snapshot.currency ?? undefined)}</td>
                    <td className="px-4 py-3">{formatCurrency(snapshot.lowPrice, snapshot.currency ?? undefined)}</td>
                    <td className="px-4 py-3">{formatCurrency(snapshot.highPrice, snapshot.currency ?? undefined)}</td>
                    <td className="px-4 py-3">{snapshot.source}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </Panel>
    </div>
  );
}
