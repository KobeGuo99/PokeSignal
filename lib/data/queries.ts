import { Prisma, RecommendationCategory, SyncStatus } from "@prisma/client";

import { signalConfig } from "@/lib/config/signal-config";
import { prisma } from "@/lib/db/prisma";
import { env } from "@/lib/env";
import { convertToUsd, getUsdDisplayMetadata } from "@/lib/fx/usd";

export type SignalCardView = {
  id: string;
  externalId: string;
  name: string;
  setName: string;
  rarity: string | null;
  imageUrl: string | null;
  currentPrice: number | null;
  currency: string | null;
  sourceCurrency: string | null;
  priceProvider: "tcgplayer" | "cardmarket" | "unknown";
  change1d: number | null;
  change7d: number | null;
  change30d: number | null;
  category: RecommendationCategory;
  confidence: number | null;
  ruleScore: number | null;
  modelScore: number | null;
  explanation: string;
  dataQualityScore: number | null;
  dataPoints: number;
  asOfDate: Date | null;
  isWatchlisted: boolean;
};

export type DashboardFilters = {
  search: string;
  set: string;
  rarity: string;
  category: string;
  minPrice: string;
  maxPrice: string;
  minHistory: string;
  sort: string;
};

function parseNumber(value: string): number | null {
  if (!value) {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function compareNullableNumbers(left: number | null, right: number | null): number {
  const safeLeft = left ?? Number.NEGATIVE_INFINITY;
  const safeRight = right ?? Number.NEGATIVE_INFINITY;
  return safeRight - safeLeft;
}

type CardWithLatestSnapshots = Prisma.CardGetPayload<{
  include: {
    priceSnapshots: {
      orderBy: { priceDate: "desc" };
      take: 1;
    };
    featureSnapshots: {
      orderBy: { asOfDate: "desc" };
      take: 1;
    };
    recommendationSnapshots: {
      orderBy: { asOfDate: "desc" };
      take: 1;
    };
    watchlistItems: {
      take: 1;
    };
  };
}>;

function getPricingProvider(rawPayload: Prisma.JsonValue | null): "tcgplayer" | "cardmarket" | "unknown" {
  if (!rawPayload || typeof rawPayload !== "object" || Array.isArray(rawPayload)) {
    return "unknown";
  }

  const provider =
    ("pricingProvider" in rawPayload ? rawPayload.pricingProvider : null) ??
    ("payload" in rawPayload &&
    rawPayload.payload &&
    typeof rawPayload.payload === "object" &&
    !Array.isArray(rawPayload.payload) &&
    "pricingProvider" in rawPayload.payload
      ? rawPayload.payload.pricingProvider
      : null);

  if (provider === "tcgplayer" || provider === "cardmarket") {
    return provider;
  }

  return "unknown";
}

async function mapCardRow(card: CardWithLatestSnapshots): Promise<SignalCardView> {
  const latestFeature = card.featureSnapshots[0];
  const latestRecommendation = card.recommendationSnapshots[0];
  const latestPriceSnapshot = card.priceSnapshots[0];
  const sourceCurrency = latestPriceSnapshot?.currency ?? null;
  const priceProvider = getPricingProvider(latestPriceSnapshot?.rawPayload ?? null);
  const currentPrice = await convertToUsd(latestFeature?.currentPrice ?? null, sourceCurrency);
  const { displayCurrency } = await getUsdDisplayMetadata(sourceCurrency);

  return {
    id: card.id,
    externalId: card.externalId,
    name: card.name,
    setName: card.setName,
    rarity: card.rarity,
    imageUrl: card.imageUrl,
    currentPrice,
    currency: displayCurrency,
    sourceCurrency,
    priceProvider,
    change1d: latestFeature?.change1d ?? null,
    change7d: latestFeature?.change7d ?? null,
    change30d: latestFeature?.change30d ?? null,
    category: latestRecommendation?.category ?? RecommendationCategory.WATCH,
    confidence: latestRecommendation?.confidence ?? null,
    ruleScore: latestRecommendation?.ruleScore ?? null,
    modelScore: latestRecommendation?.modelScore ?? null,
    explanation: latestRecommendation?.explanation ?? "Awaiting a fresh recommendation snapshot.",
    dataQualityScore: latestFeature?.dataQualityScore ?? null,
    dataPoints: latestFeature?.dataPoints ?? 0,
    asOfDate: latestRecommendation?.asOfDate ?? latestFeature?.asOfDate ?? null,
    isWatchlisted: card.watchlistItems.length > 0,
  };
}

function filterRows(rows: SignalCardView[], filters: DashboardFilters): SignalCardView[] {
  const minPrice = parseNumber(filters.minPrice);
  const maxPrice = parseNumber(filters.maxPrice);
  const minHistory = parseNumber(filters.minHistory);
  const search = filters.search.trim().toLowerCase();

  return rows.filter((row) => {
    if (search && !`${row.name} ${row.setName}`.toLowerCase().includes(search)) {
      return false;
    }

    if (filters.set && row.setName !== filters.set) {
      return false;
    }

    if (filters.rarity && row.rarity !== filters.rarity) {
      return false;
    }

    if (filters.category && row.category !== filters.category) {
      return false;
    }

    if (minPrice !== null && (row.currentPrice ?? -1) < minPrice) {
      return false;
    }

    if (maxPrice !== null && (row.currentPrice ?? Number.POSITIVE_INFINITY) > maxPrice) {
      return false;
    }

    if (minHistory !== null && row.dataPoints < minHistory) {
      return false;
    }

    return true;
  });
}

function sortRows(rows: SignalCardView[], sortKey: string): SignalCardView[] {
  const sorted = [...rows];

  switch (sortKey) {
    case "change1d":
      sorted.sort((left, right) => compareNullableNumbers(left.change1d, right.change1d));
      break;
    case "change7d":
      sorted.sort((left, right) => compareNullableNumbers(left.change7d, right.change7d));
      break;
    case "change30d":
      sorted.sort((left, right) => compareNullableNumbers(left.change30d, right.change30d));
      break;
    case "price":
      sorted.sort((left, right) => compareNullableNumbers(left.currentPrice, right.currentPrice));
      break;
    case "confidence":
      sorted.sort((left, right) => compareNullableNumbers(left.confidence, right.confidence));
      break;
    default:
      sorted.sort((left, right) => compareNullableNumbers(left.ruleScore, right.ruleScore));
  }

  return sorted;
}

export async function getDashboardData(filters: DashboardFilters) {
  const cards = await prisma.card.findMany({
    include: {
      priceSnapshots: {
        orderBy: { priceDate: "desc" },
        take: 1,
      },
      featureSnapshots: {
        orderBy: { asOfDate: "desc" },
        take: 1,
      },
      recommendationSnapshots: {
        orderBy: { asOfDate: "desc" },
        take: 1,
      },
      watchlistItems: {
        take: 1,
      },
    },
    orderBy: { name: "asc" },
  });

  const rows = await Promise.all(cards.map((card) => mapCardRow(card)));
  const pricedRows = rows.filter(
    (row) => row.currentPrice !== null && row.priceProvider === "tcgplayer",
  );
  const filteredRows = sortRows(filterRows(pricedRows, filters), filters.sort);
  const recentSync = await prisma.syncRun.findFirst({
    orderBy: { startedAt: "desc" },
  });
  const activeModel = await prisma.modelVersion.findFirst({
    where: { isActive: true },
    orderBy: { trainedAt: "desc" },
  });

  const topStrongBuyDip = filteredRows
    .filter((row) => row.category === RecommendationCategory.STRONG_BUY_DIP)
    .slice(0, 6);
  const topMomentumBuy = filteredRows
    .filter((row) => row.category === RecommendationCategory.MOMENTUM_BUY)
    .slice(0, 6);
  const topAvoid = filteredRows
    .filter((row) => row.category === RecommendationCategory.AVOID)
    .slice(0, 6);
  const recentMovers = [...filteredRows]
    .sort((left, right) => compareNullableNumbers(Math.abs(left.change1d ?? 0), Math.abs(right.change1d ?? 0)))
    .slice(0, 6);

  return {
    rows: filteredRows,
    sections: {
      topStrongBuyDip,
      topMomentumBuy,
      topAvoid,
      recentMovers,
    },
    filters: {
      sets: [...new Set(pricedRows.map((row) => row.setName))].sort(),
      rarities: [
        ...new Set(
          pricedRows.map((row) => row.rarity).filter((value): value is string => Boolean(value)),
        ),
      ].sort(),
    },
    summary: {
      totalTrackedCards: pricedRows.length,
      lastSyncAt: recentSync?.finishedAt ?? recentSync?.startedAt ?? null,
      lastSyncStatus: recentSync?.status ?? SyncStatus.FAILED,
      modelStatus: activeModel
        ? {
            version: activeModel.version,
            trainedAt: activeModel.trainedAt,
            metrics: activeModel.metrics,
            enabled: env.ENABLE_MODEL_SCORING,
          }
        : null,
    },
  };
}

export async function getCardDetail(cardId: string) {
  const card = await prisma.card.findUnique({
    where: { id: cardId },
    include: {
      priceSnapshots: {
        orderBy: { priceDate: "asc" },
      },
      featureSnapshots: {
        orderBy: { asOfDate: "desc" },
        take: 1,
      },
      recommendationSnapshots: {
        orderBy: { asOfDate: "desc" },
        take: 1,
      },
      watchlistItems: {
        take: 1,
      },
    },
  });

  if (!card) {
    return null;
  }

  const sourceCurrency = card.priceSnapshots.at(-1)?.currency ?? null;
  const priceProvider = getPricingProvider(card.priceSnapshots.at(-1)?.rawPayload ?? null);
  const latestFeatureSnapshot = card.featureSnapshots[0] ?? null;
  const latestRecommendation = card.recommendationSnapshots[0] ?? null;
  const displayMetadata = await getUsdDisplayMetadata(sourceCurrency);
  const latestFeature = latestFeatureSnapshot
    ? {
        ...latestFeatureSnapshot,
        currentPrice: await convertToUsd(latestFeatureSnapshot.currentPrice ?? null, sourceCurrency),
        previousPrice: await convertToUsd(latestFeatureSnapshot.previousPrice ?? null, sourceCurrency),
        sma7: await convertToUsd(latestFeatureSnapshot.sma7 ?? null, sourceCurrency),
        sma30: await convertToUsd(latestFeatureSnapshot.sma30 ?? null, sourceCurrency),
      }
    : null;

  return {
    card,
    latestFeature,
    latestRecommendation,
    isWatchlisted: card.watchlistItems.length > 0,
    latestPriceSnapshot: card.priceSnapshots.at(-1) ?? null,
    priceProvider,
    displayCurrency: displayMetadata.displayCurrency,
    convertedFromCurrency: displayMetadata.convertedFromCurrency,
    eurToUsdRate: displayMetadata.eurToUsdRate,
    priceHistory: await Promise.all(
      card.priceSnapshots.map(async (snapshot) => ({
        priceDate: snapshot.priceDate.toISOString().slice(0, 10),
        marketPrice: await convertToUsd(
          snapshot.marketPrice ? Number(snapshot.marketPrice) : null,
          snapshot.currency,
        ),
        lowPrice: await convertToUsd(
          snapshot.lowPrice ? Number(snapshot.lowPrice) : null,
          snapshot.currency,
        ),
        highPrice: await convertToUsd(
          snapshot.highPrice ? Number(snapshot.highPrice) : null,
          snapshot.currency,
        ),
        currency: displayMetadata.displayCurrency,
        source: snapshot.source,
        priceProvider: getPricingProvider(snapshot.rawPayload),
      })),
    ),
  };
}

export async function getWatchlistData() {
  const watchlistItems = await prisma.watchlistItem.findMany({
    include: {
      card: {
        include: {
          priceSnapshots: {
            orderBy: { priceDate: "desc" },
            take: 1,
          },
          featureSnapshots: {
            orderBy: { asOfDate: "desc" },
            take: 1,
          },
          recommendationSnapshots: {
            orderBy: { asOfDate: "desc" },
            take: 1,
          },
          watchlistItems: {
            take: 1,
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return Promise.all(
    watchlistItems.map((item) =>
      mapCardRow({
        ...item.card,
        watchlistItems: item.card.watchlistItems,
      }),
    ),
  );
}

export async function getAdminData() {
  const latestSync = await prisma.syncRun.findFirst({
    orderBy: { startedAt: "desc" },
  });
  const latestModel = await prisma.modelVersion.findFirst({
    where: { isActive: true },
    orderBy: { trainedAt: "desc" },
  });
  const cardCount = await prisma.card.count();
  const snapshotCount = await prisma.cardPriceSnapshot.count();

  return {
    latestSync,
    latestModel,
    cardCount,
    snapshotCount,
    config: {
      syncCardLimit: signalConfig.sync.cardLimit,
      syncBatchSize: signalConfig.sync.batchSize,
      autoSyncEnabled: env.AUTO_SYNC_ENABLED,
      autoSyncCheckIntervalMinutes: env.AUTO_SYNC_CHECK_INTERVAL_MINUTES,
      minimumHistoryDays: signalConfig.history.minimumDays,
      modelHorizonDays: signalConfig.model.horizonDays,
      modelEnabled: signalConfig.model.enabled,
    },
  };
}

export function getDefaultFilters(searchParams: Record<string, string | string[] | undefined>): DashboardFilters {
  return {
    search: typeof searchParams.search === "string" ? searchParams.search : "",
    set: typeof searchParams.set === "string" ? searchParams.set : "",
    rarity: typeof searchParams.rarity === "string" ? searchParams.rarity : "",
    category: typeof searchParams.category === "string" ? searchParams.category : "",
    minPrice: typeof searchParams.minPrice === "string" ? searchParams.minPrice : "",
    maxPrice: typeof searchParams.maxPrice === "string" ? searchParams.maxPrice : "",
    minHistory: typeof searchParams.minHistory === "string" ? searchParams.minHistory : "",
    sort: typeof searchParams.sort === "string" ? searchParams.sort : "price",
  };
}
