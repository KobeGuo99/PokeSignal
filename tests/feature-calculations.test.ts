import { computeFeatureSnapshot } from "@/lib/features/calculations";
import { getScenarioHistory } from "@/lib/demo/scenarios";

describe("computeFeatureSnapshot", () => {
  it("detects a sharp dip with positive longer history", () => {
    const result = computeFeatureSnapshot({
      priceHistory: getScenarioHistory("sv08.5-161"),
      setReleaseDate: new Date("2025-01-17T00:00:00.000Z"),
      rarityScore: 0.95,
    });

    expect(result.currentPrice).toBeCloseTo(196, 5);
    expect(result.change7d).toBeLessThan(-0.02);
    expect(result.change30d).toBeGreaterThan(-0.15);
    expect(result.dataQualityScore).toBeGreaterThan(0.8);
  });

  it("flags sparse data quality when history is short", () => {
    const result = computeFeatureSnapshot({
      priceHistory: getScenarioHistory("sv06-214"),
      setReleaseDate: new Date("2024-05-24T00:00:00.000Z"),
      rarityScore: 0.62,
    });

    expect(result.dataPoints).toBe(10);
    expect(result.dataQualityScore).toBeLessThan(0.5);
  });
});
