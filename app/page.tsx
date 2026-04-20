import Link from "next/link";

import { Panel } from "@/components/ui/panel";
import { FilterBar } from "@/components/dashboard/filter-bar";
import { RankingTable } from "@/components/dashboard/ranking-table";
import { getDashboardData, getDefaultFilters } from "@/lib/data/queries";
import { formatRelativeTime } from "@/lib/utils/format";

export const dynamic = "force-dynamic";

function buildLoadMoreHref(
  searchParams: Record<string, string | string[] | undefined>,
  nextLimit: number,
): string {
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(searchParams)) {
    if (key === "limit" || value === undefined) {
      continue;
    }

    if (Array.isArray(value)) {
      for (const item of value) {
        params.append(key, item);
      }
      continue;
    }

    params.set(key, value);
  }

  params.set("limit", String(nextLimit));

  return `/?${params.toString()}`;
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const resolvedSearchParams = await searchParams;
  const filters = getDefaultFilters(resolvedSearchParams);
  const data = await getDashboardData(filters);
  const loadMoreHref = buildLoadMoreHref(
    resolvedSearchParams,
    data.pagination.nextLimit,
  );

  return (
    <div className="space-y-6">
      <section className="signal-grid items-start">
        <div className="space-y-4">
          <p className="text-sm font-semibold uppercase tracking-[0.25em] text-teal-700">Dashboard</p>
          <h1 className="font-display max-w-3xl text-4xl font-semibold tracking-tight text-slate-950 sm:text-5xl">
            Spot pullback entries, avoid falling knives, and sanity-check momentum before chasing it.
          </h1>
          <p className="max-w-2xl text-lg text-slate-600">
            PokeSignal stores daily snapshots, computes transparent trend features, and keeps the model honest when the market data is noisy.
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          <Panel title={String(data.summary.totalTrackedCards)} subtitle="Tracked cards" />
          <Panel title={formatRelativeTime(data.summary.lastSyncAt)} subtitle="Last sync" />
          <Panel
            title={data.summary.modelStatus?.enabled ? "Model enabled" : "Model optional"}
            subtitle={data.summary.modelStatus?.version ?? "No active artifact"}
          />
        </div>
      </section>

      <FilterBar
        filters={filters}
        availableSets={data.filters.sets}
        availableRarities={data.filters.rarities}
      />

      <div className="grid gap-6 xl:grid-cols-2">
        <RankingTable
          title="Top Strong Buy Dip Cards"
          subtitle="Pullbacks that still retain medium-term structure."
          rows={data.sections.topStrongBuyDip}
        />
        <RankingTable
          title="Top Momentum Buy Cards"
          subtitle="Positive trend plus a model-assisted continuation check."
          rows={data.sections.topMomentumBuy}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <RankingTable
          title="Top Avoid Cards"
          subtitle="Multi-window weakness and unstable drawdowns."
          rows={data.sections.topAvoid}
        />
        <RankingTable
          title="Recently Changed Cards"
          subtitle="Largest recent day-over-day moves."
          rows={data.sections.recentMovers}
        />
      </div>

      <RankingTable
        title="All Ranked Cards"
        subtitle={`Showing ${data.pagination.visibleCount} of ${data.summary.filteredTrackedCards} filtered cards.`}
        rows={data.rows}
      />

      {data.pagination.hasMore ? (
        <div className="flex justify-center">
          <Link
            className="rounded-full border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-800 shadow-sm transition hover:border-slate-400 hover:text-slate-950"
            href={loadMoreHref}
          >
            Load 50 more cards
          </Link>
        </div>
      ) : null}
    </div>
  );
}
