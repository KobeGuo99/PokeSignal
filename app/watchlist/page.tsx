import { RankingTable } from "@/components/dashboard/ranking-table";
import { getWatchlistData } from "@/lib/data/queries";

export const dynamic = "force-dynamic";

export default async function WatchlistPage() {
  const rows = await getWatchlistData();

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.25em] text-teal-700">Watchlist</p>
        <h1 className="font-display mt-2 text-4xl font-semibold tracking-tight">Cards you’re monitoring</h1>
        <p className="mt-2 max-w-2xl text-slate-600">
          This MVP keeps a single local watchlist, but the data model is already ready for user-scoped watchlists later.
        </p>
      </div>
      <RankingTable
        title="Watchlist"
        subtitle="Sorted by latest signal strength."
        rows={rows}
      />
    </div>
  );
}
