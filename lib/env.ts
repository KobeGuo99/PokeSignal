import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  APP_URL: z.string().url().default("http://localhost:3000"),
  TCGDEX_API_URL: z.string().url().default("https://api.tcgdex.net/v2"),
  SYNC_CARD_LIMIT: z.coerce.number().int().positive().default(800),
  SYNC_PAGE_SIZE: z.coerce.number().int().positive().max(250).default(100),
  SYNC_RETRY_COUNT: z.coerce.number().int().nonnegative().default(3),
  SYNC_RETRY_DELAY_MS: z.coerce.number().int().positive().default(500),
  AUTO_SYNC_ENABLED: z
    .string()
    .optional()
    .transform((value) => value !== "false"),
  AUTO_SYNC_CHECK_INTERVAL_MINUTES: z.coerce.number().int().positive().default(60),
  MIN_HISTORY_DAYS: z.coerce.number().int().positive().default(30),
  MODEL_HORIZON_DAYS: z.coerce.number().int().positive().default(7),
  MODEL_ARTIFACT_PATH: z.string().default("python/artifacts/current-model.json"),
  CRON_SECRET: z.string().optional(),
  ENABLE_MODEL_SCORING: z
    .string()
    .optional()
    .transform((value) => value !== "false"),
});

export const env = envSchema.parse({
  NODE_ENV: process.env.NODE_ENV,
  DATABASE_URL: process.env.DATABASE_URL,
  APP_URL: process.env.APP_URL,
  TCGDEX_API_URL: process.env.TCGDEX_API_URL,
  SYNC_CARD_LIMIT: process.env.SYNC_CARD_LIMIT,
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
