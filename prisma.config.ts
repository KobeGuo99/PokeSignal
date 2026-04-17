import "dotenv/config";
import { defineConfig, env } from "prisma/config";

const fallbackDatabaseUrl =
  process.env.DATABASE_URL ??
  "postgresql://postgres:postgres@localhost:5432/pokesignal?schema=public";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url: fallbackDatabaseUrl || env("DATABASE_URL"),
  },
});
