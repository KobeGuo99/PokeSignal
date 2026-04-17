import { z } from "zod";

function sanitizeEnvValue(value: unknown) {
  if (typeof value !== "string") {
    return value;
  }

  return value.replace(/\\n/g, "").trim();
}

function stringBoolean(defaultValue: boolean) {
  return z
    .preprocess(sanitizeEnvValue, z.string().optional())
    .transform((value) => (value === undefined ? defaultValue : value !== "false"));
}

function positiveInt(defaultValue: number) {
  return z.preprocess(sanitizeEnvValue, z.coerce.number().int().positive().default(defaultValue));
}

function nonNegativeInt(defaultValue: number) {
  return z.preprocess(
    sanitizeEnvValue,
    z.coerce.number().int().nonnegative().default(defaultValue),
  );
}

function positiveIntOrNull(defaultValue: number | null) {
  return z.preprocess((value) => {
    const sanitized = sanitizeEnvValue(value);

    if (
      sanitized === undefined ||
      sanitized === null ||
      sanitized === "" ||
      sanitized === "0" ||
      sanitized === "all"
    ) {
      return defaultValue;
    }

    return sanitized;
  }, z.union([z.null(), z.coerce.number().int().positive()]));
}

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  DATABASE_URL: z.preprocess(sanitizeEnvValue, z.string().min(1, "DATABASE_URL is required")),
  APP_URL: z.preprocess(sanitizeEnvValue, z.string().url().default("http://localhost:3000")),
  TCGDEX_API_URL: z.preprocess(
    sanitizeEnvValue,
    z.string().url().default("https://api.tcgdex.net/v2"),
  ),
  SYNC_CARD_LIMIT: positiveIntOrNull(null),
  SYNC_BATCH_SIZE: positiveInt(500),
  SYNC_PAGE_SIZE: z.preprocess(
    sanitizeEnvValue,
    z.coerce.number().int().positive().max(250).default(100),
  ),
  SYNC_RETRY_COUNT: nonNegativeInt(3),
  SYNC_RETRY_DELAY_MS: positiveInt(500),
  AUTO_SYNC_ENABLED: stringBoolean(true),
  AUTO_SYNC_CHECK_INTERVAL_MINUTES: positiveInt(60),
  MIN_HISTORY_DAYS: positiveInt(30),
  MODEL_HORIZON_DAYS: positiveInt(7),
  MODEL_ARTIFACT_PATH: z.preprocess(
    sanitizeEnvValue,
    z.string().default("python/artifacts/current-model.json"),
  ),
  CRON_SECRET: z.preprocess(sanitizeEnvValue, z.string().optional()),
  ENABLE_MODEL_SCORING: stringBoolean(true),
});

export const env = envSchema.parse({
  NODE_ENV: process.env.NODE_ENV,
  DATABASE_URL: process.env.DATABASE_URL,
  APP_URL: process.env.APP_URL,
  TCGDEX_API_URL: process.env.TCGDEX_API_URL,
  SYNC_CARD_LIMIT: process.env.SYNC_CARD_LIMIT,
  SYNC_BATCH_SIZE: process.env.SYNC_BATCH_SIZE,
  SYNC_PAGE_SIZE: process.env.SYNC_PAGE_SIZE,
  SYNC_RETRY_COUNT: process.env.SYNC_RETRY_COUNT,
  SYNC_RETRY_DELAY_MS: process.env.SYNC_RETRY_DELAY_MS,
  AUTO_SYNC_ENABLED: process.env.AUTO_SYNC_ENABLED,
  AUTO_SYNC_CHECK_INTERVAL_MINUTES: process.env.AUTO_SYNC_CHECK_INTERVAL_MINUTES,
  MIN_HISTORY_DAYS: process.env.MIN_HISTORY_DAYS,
  MODEL_HORIZON_DAYS: process.env.MODEL_HORIZON_DAYS,
  MODEL_ARTIFACT_PATH: process.env.MODEL_ARTIFACT_PATH,
  CRON_SECRET: process.env.CRON_SECRET,
  ENABLE_MODEL_SCORING: process.env.ENABLE_MODEL_SCORING,
});
