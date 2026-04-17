import { RecommendationCategory } from "@prisma/client";
import { vi } from "vitest";

vi.mock("@/lib/ml/inference", () => ({
  scoreContinuationProbability: vi.fn(),
}));

import { getScenarioHistory } from "@/lib/demo/scenarios";
import { computeFeatureSnapshot } from "@/lib/features/calculations";
import { resolveRecommendation } from "@/lib/recommendations/engine";
import { scoreContinuationProbability } from "@/lib/ml/inference";

describe("resolveRecommendation", () => {
  it("classifies falling knives as avoid", async () => {
    vi.mocked(scoreContinuationProbability).mockResolvedValue(null);

    const features = computeFeatureSnapshot({
      priceHistory: getScenarioHistory("swsh8-157"),
    });

    const result = await resolveRecommendation(features);
    expect(result.category).toBe(RecommendationCategory.AVOID);
  });

  it("classifies healthy pullbacks as strong buy dips", async () => {
    vi.mocked(scoreContinuationProbability).mockResolvedValue(null);

    const features = computeFeatureSnapshot({
      priceHistory: getScenarioHistory("sv08.5-161"),
    });

    const result = await resolveRecommendation(features);
    expect(result.category).toBe(RecommendationCategory.STRONG_BUY_DIP);
  });

  it("classifies sustained momentum as momentum buy when the model agrees", async () => {
    vi.mocked(scoreContinuationProbability).mockResolvedValue(0.71);

    const features = computeFeatureSnapshot({
      priceHistory: getScenarioHistory("sv08-219"),
    });

    const result = await resolveRecommendation(features);
    expect(result.category).toBe(RecommendationCategory.MOMENTUM_BUY);
    expect(result.modelScore).toBeCloseTo(0.71, 4);
  });

  it("keeps sideways cards on watch", async () => {
    vi.mocked(scoreContinuationProbability).mockResolvedValue(0.51);

    const features = computeFeatureSnapshot({
      priceHistory: getScenarioHistory("sv03.5-193"),
    });

    const result = await resolveRecommendation(features);
    expect(result.category).toBe(RecommendationCategory.WATCH);
  });
});
