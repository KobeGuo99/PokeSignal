import { PriceSource, Prisma, SyncStatus } from "@prisma/client";

import {
  fetchTcgdexSyncRecordsForCandidates,
  listEnglishCardCandidates,
} from "@/lib/api/providers/tcgdex";
import { signalConfig } from "@/lib/config/signal-config";
import { prisma } from "@/lib/db/prisma";
import { computeFeatureSnapshot } from "@/lib/features/calculations";
import { resolveRecommendation } from "@/lib/recommendations/engine";
import { mapWithConcurrency } from "@/lib/utils/async";
import { toStartOfDay } from "@/lib/utils/date";
import { logger } from "@/lib/utils/logger";

const SNAPSHOT_PERSIST_CONCURRENCY = 8;

type RunSyncOptions = {
  maxBatches?: number;
  limit?: number | null;
};

function rarityScore(rarity: string | null): number | null {
  if (!rarity) {
    return null;
  }

  const rarityScores: Record<string, number> = signalConfig.rarityScores;
  return rarityScores[rarity] ?? 0.5;
}

function decimal(value: number | null): Prisma.Decimal | null {
  return value === null ? null : new Prisma.Decimal(value);
}

async function getSyncedExternalIdsForDate(priceDate: Date): Promise<Set<string>> {
  const rows = await prisma.cardPriceSnapshot.findMany({
    where: {
      source: PriceSource.TCGDEX,
      priceDate,
    },
    select: {
      card: {
        select: {
          externalId: true,
        },
      },
    },
  });

  return new Set(rows.map((row) => row.card.externalId));
}

export async function recomputeCardAnalytics(cardId: string, asOfDate?: Date) {
  const card = await prisma.card.findUnique({
    where: { id: cardId },
    include: {
      priceSnapshots: {
        orderBy: { priceDate: "asc" },
      },
    },
  });

  if (!card) {
    return null;
  }

  const featureSet = computeFeatureSnapshot({
    priceHistory: card.priceSnapshots
      .filter((snapshot) => snapshot.marketPrice !== null)
      .map((snapshot) => ({
        priceDate: snapshot.priceDate,
        marketPrice: Number(snapshot.marketPrice),
        liquidityScore: snapshot.liquidityScore,
      })),
    asOfDate,
    setReleaseDate: card.setReleaseDate,
    rarityScore: rarityScore(card.rarity),
  });

  const recommendation = await resolveRecommendation(featureSet);

  await prisma.$transaction([
    prisma.cardFeatureSnapshot.upsert({
      where: {
        cardId_asOfDate: {
          cardId: card.id,
          asOfDate: featureSet.asOfDate,
        },
      },
      create: {
        cardId: card.id,
        asOfDate: featureSet.asOfDate,
        currentPrice: featureSet.currentPrice,
        previousPrice: featureSet.previousPrice,
        change1d: featureSet.change1d,
        change7d: featureSet.change7d,
        change30d: featureSet.change30d,
        volatility7d: featureSet.volatility7d,
        sma7: featureSet.sma7,
        sma30: featureSet.sma30,
        trendSlope7d: featureSet.trendSlope7d,
        drawdownFromPeak30d: featureSet.drawdownFromPeak30d,
        dataQualityScore: featureSet.dataQualityScore,
        dataPoints: featureSet.dataPoints,
        liquidityScore: featureSet.liquidityScore,
        setAgeDays: featureSet.setAgeDays,
        rarityScore: featureSet.rarityScore,
        featurePayload: featureSet.featurePayload,
      },
      update: {
        currentPrice: featureSet.currentPrice,
        previousPrice: featureSet.previousPrice,
        change1d: featureSet.change1d,
        change7d: featureSet.change7d,
        change30d: featureSet.change30d,
        volatility7d: featureSet.volatility7d,
        sma7: featureSet.sma7,
        sma30: featureSet.sma30,
        trendSlope7d: featureSet.trendSlope7d,
        drawdownFromPeak30d: featureSet.drawdownFromPeak30d,
        dataQualityScore: featureSet.dataQualityScore,
        dataPoints: featureSet.dataPoints,
        liquidityScore: featureSet.liquidityScore,
        setAgeDays: featureSet.setAgeDays,
        rarityScore: featureSet.rarityScore,
        featurePayload: featureSet.featurePayload,
      },
    }),
    prisma.recommendationSnapshot.upsert({
      where: {
        cardId_asOfDate: {
          cardId: card.id,
          asOfDate: featureSet.asOfDate,
        },
      },
      create: {
        cardId: card.id,
        asOfDate: featureSet.asOfDate,
        category: recommendation.category,
        ruleScore: recommendation.ruleScore,
        modelScore: recommendation.modelScore,
        confidence: recommendation.confidence,
        dataQualityScore: recommendation.dataQualityScore,
        explanation: recommendation.explanation,
        isModelEnabled: recommendation.isModelEnabled,
      },
      update: {
        category: recommendation.category,
        ruleScore: recommendation.ruleScore,
        modelScore: recommendation.modelScore,
        confidence: recommendation.confidence,
        dataQualityScore: recommendation.dataQualityScore,
        explanation: recommendation.explanation,
        isModelEnabled: recommendation.isModelEnabled,
      },
    }),
  ]);

  return recommendation;
}

export async function runSync(syncDate = new Date(), options: RunSyncOptions = {}) {
  const priceDate = toStartOfDay(syncDate);
  const batchSize = signalConfig.sync.batchSize;
  const maxBatches = Math.max(1, options.maxBatches ?? Number.MAX_SAFE_INTEGER);
  const limit = options.limit ?? signalConfig.sync.cardLimit;
  const syncRun = await prisma.syncRun.create({
    data: {
      status: SyncStatus.RUNNING,
    },
  });

  try {
    const candidates = await listEnglishCardCandidates(limit);
    const processedExternalIds = await getSyncedExternalIdsForDate(priceDate);
    const remainingCandidates = candidates.filter(
      (candidate) => !processedExternalIds.has(candidate.cardId),
    );

    let recordsFetched = 0;
    let recordsInserted = 0;
    let cardsProcessed = 0;
    let errorsCount = 0;
    let batchesProcessed = 0;

    while (remainingCandidates.length > 0 && batchesProcessed < maxBatches) {
      const batchCandidates = remainingCandidates.splice(0, batchSize);
      const syncRecords = await fetchTcgdexSyncRecordsForCandidates(batchCandidates, priceDate);

      recordsFetched += syncRecords.length;

      const upsertedCards = await Promise.all(
        syncRecords.map((record) =>
          prisma.card.upsert({
            where: { externalId: record.metadata.externalId },
            create: {
              ...record.metadata,
              metadata: record.metadata.metadata as Prisma.InputJsonValue,
            },
            update: {
              ...record.metadata,
              metadata: record.metadata.metadata as Prisma.InputJsonValue,
            },
          }),
        ),
      );

      const pricingByExternalId = new Map(
        syncRecords.map((record) => [record.metadata.externalId, record.pricing]),
      );

      await mapWithConcurrency(upsertedCards, SNAPSHOT_PERSIST_CONCURRENCY, async (card) => {
        try {
          const pricing = pricingByExternalId.get(card.externalId) ?? null;

          await prisma.cardPriceSnapshot.upsert({
            where: {
              cardId_source_priceDate: {
                cardId: card.id,
                source: PriceSource.TCGDEX,
                priceDate,
              },
            },
            create: {
              cardId: card.id,
              source: PriceSource.TCGDEX,
              priceDate,
              currency: pricing?.currency ?? null,
              marketPrice: decimal(pricing?.marketPrice ?? null),
              lowPrice: decimal(pricing?.lowPrice ?? null),
              midPrice: decimal(pricing?.midPrice ?? null),
              highPrice: decimal(pricing?.highPrice ?? null),
              directLowPrice: decimal(pricing?.directLowPrice ?? null),
              liquidityScore: pricing?.liquidityScore ?? null,
              rawPayload: {
                provider: "tcgdex",
                pricingAvailable: pricing !== null,
                payload: pricing?.rawPayload ?? null,
              } as Prisma.InputJsonValue,
            },
            update: {
              currency: pricing?.currency ?? null,
              marketPrice: decimal(pricing?.marketPrice ?? null),
              lowPrice: decimal(pricing?.lowPrice ?? null),
              midPrice: decimal(pricing?.midPrice ?? null),
              highPrice: decimal(pricing?.highPrice ?? null),
              directLowPrice: decimal(pricing?.directLowPrice ?? null),
              liquidityScore: pricing?.liquidityScore ?? null,
              rawPayload: {
                provider: "tcgdex",
                pricingAvailable: pricing !== null,
                payload: pricing?.rawPayload ?? null,
              } as Prisma.InputJsonValue,
            },
          });

          await recomputeCardAnalytics(card.id, priceDate);

          if (pricing !== null) {
            recordsInserted += 1;
          }

          cardsProcessed += 1;
          processedExternalIds.add(card.externalId);
          return pricing;
        } catch (error) {
          errorsCount += 1;
          logger.warn("Failed to sync card pricing", {
            cardId: card.id,
            externalId: card.externalId,
            error: error instanceof Error ? error.message : String(error),
          });
          return null;
        }
      });

      batchesProcessed += 1;
    }

    const remainingCount = Math.max(0, candidates.length - processedExternalIds.size);

    await prisma.syncRun.update({
      where: { id: syncRun.id },
      data: {
        status: SyncStatus.SUCCESS,
        finishedAt: new Date(),
        recordsFetched,
        recordsInserted,
        cardsProcessed,
        errorsCount,
        sourceSummary: {
          metadataSource: "tcgdex",
          pricingSource: "tcgdex",
          candidateLimit: limit,
          totalCandidates: candidates.length,
          remainingCandidates: remainingCount,
          batchesProcessed,
          batchSize,
          isComplete: remainingCount === 0,
        },
      },
    });

    return {
      syncRunId: syncRun.id,
      recordsFetched,
      recordsInserted,
      cardsProcessed,
      errorsCount,
      totalCandidates: candidates.length,
      remainingCandidates: remainingCount,
      batchesProcessed,
      isComplete: remainingCount === 0,
    };
  } catch (error) {
    await prisma.syncRun.update({
      where: { id: syncRun.id },
      data: {
        status: SyncStatus.FAILED,
        finishedAt: new Date(),
        errorMessage: error instanceof Error ? error.message : String(error),
      },
    });
    throw error;
  }
}
