import { RecommendationCategory } from "@prisma/client";

import { signalConfig } from "@/lib/config/signal-config";
import type { ComputedFeatureSet } from "@/lib/features/types";
import { scoreContinuationProbability } from "@/lib/ml/inference";
import type { RecommendationResult } from "@/lib/recommendations/types";
import { clamp } from "@/lib/utils/math";

function describeVolatility(volatility: number | null): string {
  if (volatility === null) {
    return "unknown volatility";
  }

  if (volatility <= 0.06) {
    return "low volatility";
  }

  if (volatility <= 0.12) {
    return "moderate volatility";
  }

  return "high volatility";
}

function buildExplanation(
  category: RecommendationCategory,
  features: ComputedFeatureSet,
  modelScore: number | null,
): string {
  const parts: string[] = [];

  if (features.change7d !== null) {
    parts.push(
      `${features.change7d >= 0 ? "Up" : "Down"} ${Math.abs(features.change7d * 100).toFixed(1)}% over 7 days`,
    );
  }

  if (features.change30d !== null) {
    parts.push(
      `${features.change30d >= 0 ? "up" : "down"} ${Math.abs(features.change30d * 100).toFixed(1)}% over 30 days`,
    );
  }

  parts.push(describeVolatility(features.volatility7d));

  if (category === RecommendationCategory.STRONG_BUY_DIP) {
    parts.push("the longer trend is not fully broken");
  }

  if (category === RecommendationCategory.AVOID) {
    parts.push("the decline still looks unstable");
  }

  if (category === RecommendationCategory.MOMENTUM_BUY && modelScore !== null) {
    parts.push(`model continuation probability ${(modelScore * 100).toFixed(0)}%`);
  }

  return parts.join(", ") + ".";
}

function computeDipScore(features: ComputedFeatureSet): number {
  if (features.change7d === null || features.change7d > signalConfig.rules.dipThreshold7d) {
    return 0;
  }

  const score =
    0.36 +
    (features.change30d !== null && features.change30d >= signalConfig.rules.dipThreshold30dFloor
      ? 0.14
      : 0) +
    (features.drawdownFromPeak30d !== null &&
    features.drawdownFromPeak30d >= signalConfig.rules.dipMaxDrawdown30d
      ? 0.16
      : 0) +
    (features.volatility7d !== null &&
    features.volatility7d <= signalConfig.rules.dipMaxVolatility7d
      ? 0.14
      : 0) +
    (features.sma30 !== null &&
    features.currentPrice !== null &&
    features.currentPrice >= features.sma30 * 0.92
      ? 0.1
      : 0) +
    (features.dataQualityScore >= signalConfig.quality.medium ? 0.1 : 0);

  return clamp(score, 0, 1);
}

function computeAvoidScore(features: ComputedFeatureSet): number {
  const score =
    (features.change30d !== null && features.change30d <= signalConfig.rules.avoidMaxChange30d
      ? 0.3
      : 0) +
    (features.drawdownFromPeak30d !== null &&
    features.drawdownFromPeak30d <= signalConfig.rules.avoidMinDrawdown30d
      ? 0.24
      : 0) +
    (features.trendSlope7d !== null && features.trendSlope7d < 0 ? 0.18 : 0) +
    (features.volatility7d !== null &&
    features.volatility7d >= signalConfig.rules.avoidMinVolatility7d
      ? 0.12
      : 0) +
    (features.dataQualityScore < signalConfig.quality.medium ? 0.16 : 0);

  return clamp(score, 0, 1);
}

function computeMomentumScore(features: ComputedFeatureSet): number {
  const score =
    (features.change7d !== null && features.change7d >= signalConfig.rules.momentumMinChange7d
      ? 0.3
      : 0) +
    (features.change30d !== null && features.change30d >= signalConfig.rules.momentumMinChange30d
      ? 0.24
      : 0) +
    (features.trendSlope7d !== null && features.trendSlope7d > 0 ? 0.16 : 0) +
    (features.volatility7d !== null &&
    features.volatility7d <= signalConfig.rules.dipMaxVolatility7d
      ? 0.12
      : 0) +
    (features.change1d !== null &&
    Math.abs(features.change1d) <= signalConfig.rules.momentumMaxOneDaySpike
      ? 0.08
      : 0) +
    (features.dataQualityScore >= signalConfig.quality.medium ? 0.1 : 0);

  return clamp(score, 0, 1);
}

export async function resolveRecommendation(
  features: ComputedFeatureSet,
): Promise<RecommendationResult> {
  const dipScore = computeDipScore(features);
  const avoidScore = computeAvoidScore(features);
  const momentumScore = computeMomentumScore(features);
  const modelScore = await scoreContinuationProbability(features);
  const modelSupportsMomentum =
    modelScore === null
      ? features.dataQualityScore >= signalConfig.quality.medium
      : modelScore >= signalConfig.rules.momentumMinModelProbability;

  let category: RecommendationCategory = RecommendationCategory.WATCH;
  let ruleScore = 0.45;

  if (avoidScore >= 0.6) {
    category = RecommendationCategory.AVOID;
    ruleScore = avoidScore;
  } else if (momentumScore >= 0.58 && modelSupportsMomentum) {
    category = RecommendationCategory.MOMENTUM_BUY;
    ruleScore = momentumScore;
  } else if (dipScore >= 0.58) {
    category = RecommendationCategory.STRONG_BUY_DIP;
    ruleScore = dipScore;
  }

  let confidence = clamp(ruleScore * 0.7 + features.dataQualityScore * 0.3, 0.05, 0.98);

  if (features.dataQualityScore < signalConfig.quality.medium) {
    confidence = clamp(confidence - signalConfig.rules.confidenceSparsePenalty, 0.05, 0.98);
  }

  if (category === RecommendationCategory.MOMENTUM_BUY) {
    confidence =
      modelScore !== null
        ? clamp((confidence + modelScore) / 2, 0.05, 0.98)
        : clamp(confidence - 0.08, 0.05, 0.98);
  }

  return {
    category,
    ruleScore,
    modelScore,
    confidence,
    dataQualityScore: features.dataQualityScore,
    explanation: buildExplanation(category, features, modelScore),
    isModelEnabled: modelScore !== null,
    features,
  };
}
