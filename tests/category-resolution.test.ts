import { RecommendationCategory } from "@prisma/client";
import { vi } from "vitest";

vi.mock("@/lib/ml/inference", () => ({
  scoreContinuationProbability: vi.fn(async () => null),
}));

import { computeFeatureSnapshot } from "@/lib/features/calculations";
import { resolveRecommendation } from "@/lib/recommendations/engine";

describe("final category resolution", () => {
  it("downgrades confidence when data is sparse", async () => {
    const sparseHistory = [
      { priceDate: new Date("2026-04-10"), marketPrice: 10, liquidityScore: 0.5 },
      { priceDate: new Date("2026-04-11"), marketPrice: 9.9, liquidityScore: 0.5 },
      { priceDate: new Date("2026-04-12"), marketPrice: 10.1, liquidityScore: 0.5 },
      { priceDate: new Date("2026-04-13"), marketPrice: 10.0, liquidityScore: 0.5 },
    ];

    const result = await resolveRecommendation(
      computeFeatureSnapshot({
        priceHistory: sparseHistory,
      }),
    );

    expect(result.category).toBe(RecommendationCategory.WATCH);
    expect(result.confidence).toBeLessThan(0.45);
  });
});
