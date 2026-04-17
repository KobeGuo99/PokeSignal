import { promises as fs } from "fs";
import path from "path";

import { env } from "@/lib/env";
import type { ComputedFeatureSet } from "@/lib/features/types";
import { modelFeatureSpec } from "@/lib/ml/model-feature-spec";
import { logger } from "@/lib/utils/logger";
import { sigmoid } from "@/lib/utils/math";

type LogisticArtifact = {
  version: string;
  algorithm: "logistic_regression";
  enabled: boolean;
  horizon_days: number;
  features: string[];
  intercept: number;
  coefficients: number[];
  metrics: Record<string, number>;
  trained_at: string;
};

let cachedArtifact: LogisticArtifact | null | undefined;

async function loadArtifact(): Promise<LogisticArtifact | null> {
  if (cachedArtifact !== undefined) {
    return cachedArtifact;
  }

  try {
    const artifactName = env.MODEL_ARTIFACT_PATH.split("/").at(-1) ?? "current-model.json";
    const artifactPath = path.join(process.cwd(), "python", "artifacts", artifactName);
    const file = await fs.readFile(artifactPath, "utf8");
    const parsed = JSON.parse(file) as LogisticArtifact;

    if (
      parsed.algorithm !== "logistic_regression" ||
      !Array.isArray(parsed.coefficients) ||
      parsed.features.length !== parsed.coefficients.length
    ) {
      cachedArtifact = null;
      return null;
    }

    cachedArtifact = parsed;
    return parsed;
  } catch (error) {
    logger.warn("Model artifact unavailable", {
      error: error instanceof Error ? error.message : String(error),
    });
    cachedArtifact = null;
    return null;
  }
}

function featureValue(features: ComputedFeatureSet, key: string): number {
  const raw = features.featurePayload[key];

  if (raw === null || raw === undefined || Number.isNaN(raw)) {
    return 0;
  }

  if (key === "setAgeDays") {
    return raw / 365;
  }

  return raw;
}

export async function scoreContinuationProbability(
  features: ComputedFeatureSet,
): Promise<number | null> {
  if (!env.ENABLE_MODEL_SCORING) {
    return null;
  }

  const artifact = await loadArtifact();

  if (!artifact || !artifact.enabled) {
    return null;
  }

  const supported = artifact.features.every((feature) => modelFeatureSpec.includes(feature));

  if (!supported) {
    return null;
  }

  const linearTerm = artifact.features.reduce((sum, featureName, index) => {
    return sum + featureValue(features, featureName) * artifact.coefficients[index];
  }, artifact.intercept);

  return sigmoid(linearTerm);
}
