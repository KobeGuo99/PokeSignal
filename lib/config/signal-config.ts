import { env } from "@/lib/env";

export const signalConfig = {
  sync: {
    cardLimit: env.SYNC_CARD_LIMIT,
    batchSize: env.SYNC_BATCH_SIZE,
    pageSize: env.SYNC_PAGE_SIZE,
    retryCount: env.SYNC_RETRY_COUNT,
    retryDelayMs: env.SYNC_RETRY_DELAY_MS,
  },
  history: {
    minimumDays: env.MIN_HISTORY_DAYS,
    shortWindow: 7,
    mediumWindow: 30,
  },
  rules: {
    dipThreshold7d: -0.1,
    dipThreshold30dFloor: -0.15,
    dipMaxVolatility7d: 0.12,
    dipMaxDrawdown30d: -0.3,
    avoidMinDrawdown30d: -0.22,
    avoidMaxChange30d: -0.18,
    avoidMinVolatility7d: 0.13,
    momentumMinChange7d: 0.06,
    momentumMinChange30d: 0.08,
    momentumMaxOneDaySpike: 0.18,
    momentumMinModelProbability: 0.58,
    confidenceSparsePenalty: 0.18,
  },
  quality: {
    low: 0.35,
    medium: 0.6,
    high: 0.8,
  },
  model: {
    horizonDays: env.MODEL_HORIZON_DAYS,
    enabled: env.ENABLE_MODEL_SCORING,
  },
  rarityScores: {
    "Rare Holo": 0.72,
    "Ultra Rare": 0.88,
    "Illustration Rare": 0.84,
    "Special Illustration Rare": 0.95,
    "Rare Secret": 0.9,
    Rare: 0.62,
    Common: 0.25,
    Uncommon: 0.35,
  } satisfies Record<string, number>,
} as const;
