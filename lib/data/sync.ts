import { PriceSource, Prisma, SyncStatus } from "@prisma/client";

import { fetchTcgdexSyncRecords } from "@/lib/api/providers/tcgdex";
import { signalConfig } from "@/lib/config/signal-config";
import { prisma } from "@/lib/db/prisma";
import { computeFeatureSnapshot } from "@/lib/features/calculations";
import { resolveRecommendation } from "@/lib/recommendations/engine";
import { mapWithConcurrency } from "@/lib/utils/async";
import { toStartOfDay } from "@/lib/utils/date";
import { logger } from "@/lib/utils/logger";

const SNAPSHOT_PERSIST_CONCURRENCY = 8;

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

export async function runSync(syncDate = new Date()) {
  const priceDate = toStartOfDay(syncDate);
  const syncRun = await prisma.syncRun.create({
    data: {
      status: SyncStatus.RUNNING,
    },
  });

  try {
    const syncRecords = await fetchTcgdexSyncRecords(signalConfig.sync.cardLimit, priceDate);
    let recordsInserted = 0;

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
        const pricing = pricingByExternalId.get(card.externalId);

        if (!pricing) {
          logger.warn("Failed to sync card pricing", {
            cardId: card.id,
            externalId: card.externalId,
            error: "No pricing record was returned for a synced card.",
          });
          return null;
        }

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
            currency: pricing.currency,
            marketPrice: decimal(pricing.marketPrice),
            lowPrice: decimal(pricing.lowPrice),
            midPrice: decimal(pricing.midPrice),
            highPrice: decimal(pricing.highPrice),
            directLowPrice: decimal(pricing.directLowPrice),
            liquidityScore: pricing.liquidityScore,
            rawPayload: pricing.rawPayload as Prisma.InputJsonValue,
          },
          update: {
            currency: pricing.currency,
            marketPrice: decimal(pricing.marketPrice),
            lowPrice: decimal(pricing.lowPrice),
            midPrice: decimal(pricing.midPrice),
            highPrice: decimal(pricing.highPrice),
            directLowPrice: decimal(pricing.directLowPrice),
            liquidityScore: pricing.liquidityScore,
            rawPayload: pricing.rawPayload as Prisma.InputJsonValue,
          },
        });

        await recomputeCardAnalytics(card.id, priceDate);
        recordsInserted += 1;
        return pricing;
      } catch (error) {
        logger.warn("Failed to sync card pricing", {
          cardId: card.id,
          externalId: card.externalId,
          error: error instanceof Error ? error.message : String(error),
        });
        return null;
      }
    });

    const errorsCount = Math.max(0, syncRecords.length - recordsInserted);

    await prisma.syncRun.update({
      where: { id: syncRun.id },
      data: {
        status: SyncStatus.SUCCESS,
        finishedAt: new Date(),
        recordsFetched: syncRecords.length,
        recordsInserted,
        cardsProcessed: upsertedCards.length,
        errorsCount,
        sourceSummary: {
          metadataSource: "tcgdex",
          pricingSource: "tcgdex",
          pricingCardsOnly: true,
        },
      },
    });

    return {
      syncRunId: syncRun.id,
      recordsFetched: syncRecords.length,
      recordsInserted,
      cardsProcessed: upsertedCards.length,
      errorsCount,
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
