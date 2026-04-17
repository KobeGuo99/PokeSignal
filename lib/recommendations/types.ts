import { RecommendationCategory } from "@prisma/client";

import type { ComputedFeatureSet } from "@/lib/features/types";

export type RecommendationResult = {
  category: RecommendationCategory;
  ruleScore: number;
  modelScore: number | null;
  confidence: number;
  dataQualityScore: number;
  explanation: string;
  isModelEnabled: boolean;
  features: ComputedFeatureSet;
};
