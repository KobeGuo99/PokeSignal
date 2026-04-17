import { writeFile } from "fs/promises";
import path from "path";

import { prisma } from "@/lib/db/prisma";
import { env } from "@/lib/env";
import { modelFeatureSpec } from "@/lib/ml/model-feature-spec";
import { addCalendarDays, toStartOfDay } from "@/lib/utils/date";

type TrainingRow = {
  cardId: string;
  externalId: string;
  asOfDate: string;
  target: number;
  features: Record<string, number>;
};

function extractFeatureValue(payload: unknown, key: string): number {
  if (!payload || typeof payload !== "object") {
    return 0;
  }

  const value = (payload as Record<string, unknown>)[key];
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

async function main() {
  const featureSnapshots = await prisma.cardFeatureSnapshot.findMany({
    include: {
      card: true,
    },
    orderBy: {
      asOfDate: "asc",
    },
  });

  const rows: TrainingRow[] = [];

  for (const snapshot of featureSnapshots) {
    const futureDate = addCalendarDays(snapshot.asOfDate, env.MODEL_HORIZON_DAYS);
    const currentDate = toStartOfDay(snapshot.asOfDate);

    if ((snapshot.change7d ?? 0) <= 0.03) {
      continue;
    }

    const currentPrice = snapshot.currentPrice;
    if (currentPrice === null) {
      continue;
    }

    const futureSnapshot = await prisma.cardPriceSnapshot.findFirst({
      where: {
        cardId: snapshot.cardId,
        priceDate: {
          gte: futureDate,
        },
      },
      orderBy: {
        priceDate: "asc",
      },
    });

    if (!futureSnapshot?.marketPrice) {
      continue;
    }

    rows.push({
      cardId: snapshot.cardId,
      externalId: snapshot.card.externalId,
      asOfDate: currentDate.toISOString(),
      target: Number(futureSnapshot.marketPrice) > currentPrice ? 1 : 0,
      features: Object.fromEntries(
        modelFeatureSpec.map((feature) => [
          feature,
          extractFeatureValue(snapshot.featurePayload, feature),
        ]),
      ),
    });
  }

  const outputPath = path.resolve(process.cwd(), "python/artifacts/training-data.json");
  await writeFile(outputPath, JSON.stringify(rows, null, 2), "utf8");
  console.info(`Exported ${rows.length} training rows to ${outputPath}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
