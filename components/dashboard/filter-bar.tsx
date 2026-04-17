import Link from "next/link";
import { RecommendationCategory } from "@prisma/client";

import type { DashboardFilters } from "@/lib/data/queries";

type FilterBarProps = {
  filters: DashboardFilters;
  availableSets: string[];
  availableRarities: string[];
};

export function FilterBar({ filters, availableSets, availableRarities }: FilterBarProps) {
  return (
    <form className="panel rounded-[28px] p-5">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <label className="space-y-2 text-sm font-medium text-slate-700">
          Search
          <input
            name="search"
            defaultValue={filters.search}
            placeholder="Pikachu, Umbreon, 151..."
            className="w-full rounded-2xl border bg-white px-3 py-2.5 outline-none ring-0"
          />
        </label>
        <label className="space-y-2 text-sm font-medium text-slate-700">
          Set
          <select name="set" defaultValue={filters.set} className="w-full rounded-2xl border bg-white px-3 py-2.5">
            <option value="">All sets</option>
            {availableSets.map((setName) => (
              <option key={setName} value={setName}>
                {setName}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-2 text-sm font-medium text-slate-700">
          Rarity
          <select name="rarity" defaultValue={filters.rarity} className="w-full rounded-2xl border bg-white px-3 py-2.5">
            <option value="">All rarities</option>
            {availableRarities.map((rarity) => (
              <option key={rarity} value={rarity}>
                {rarity}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-2 text-sm font-medium text-slate-700">
          Category
          <select name="category" defaultValue={filters.category} className="w-full rounded-2xl border bg-white px-3 py-2.5">
            <option value="">All categories</option>
            {Object.values(RecommendationCategory).map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-2 text-sm font-medium text-slate-700">
          Min price
          <input name="minPrice" defaultValue={filters.minPrice} className="w-full rounded-2xl border bg-white px-3 py-2.5" />
        </label>
        <label className="space-y-2 text-sm font-medium text-slate-700">
          Max price
          <input name="maxPrice" defaultValue={filters.maxPrice} className="w-full rounded-2xl border bg-white px-3 py-2.5" />
        </label>
        <label className="space-y-2 text-sm font-medium text-slate-700">
          Minimum history days
          <input
            name="minHistory"
            defaultValue={filters.minHistory}
            placeholder="Leave blank for any history"
            className="w-full rounded-2xl border bg-white px-3 py-2.5"
          />
        </label>
        <label className="space-y-2 text-sm font-medium text-slate-700">
          Sort by
          <select name="sort" defaultValue={filters.sort} className="w-full rounded-2xl border bg-white px-3 py-2.5">
            <option value="score">Rule score</option>
            <option value="confidence">Confidence</option>
            <option value="change1d">1d change</option>
            <option value="change7d">7d change</option>
            <option value="change30d">30d change</option>
            <option value="price">Current price</option>
          </select>
        </label>
      </div>
      <div className="mt-4 flex items-center gap-3">
        <button className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white" type="submit">
          Apply filters
        </button>
        <Link className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700" href="/">
          Reset
        </Link>
      </div>
    </form>
  );
}
