-- CreateEnum
CREATE TYPE "RecommendationCategory" AS ENUM ('STRONG_BUY_DIP', 'WATCH', 'AVOID', 'MOMENTUM_BUY');

-- CreateEnum
CREATE TYPE "SyncStatus" AS ENUM ('RUNNING', 'SUCCESS', 'FAILED');

-- CreateEnum
CREATE TYPE "PriceSource" AS ENUM ('TCGDEX', 'DEMO');

-- CreateTable
CREATE TABLE "Card" (
    "id" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "setName" TEXT NOT NULL,
    "setCode" TEXT,
    "setSeries" TEXT,
    "setReleaseDate" TIMESTAMP(3),
    "number" TEXT,
    "rarity" TEXT,
    "supertype" TEXT,
    "imageUrl" TEXT,
    "imageLargeUrl" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Card_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CardPriceSnapshot" (
    "id" TEXT NOT NULL,
    "cardId" TEXT NOT NULL,
    "source" "PriceSource" NOT NULL,
    "priceDate" TIMESTAMP(3) NOT NULL,
    "currency" TEXT,
    "marketPrice" DECIMAL(12,4),
    "lowPrice" DECIMAL(12,4),
    "midPrice" DECIMAL(12,4),
    "highPrice" DECIMAL(12,4),
    "directLowPrice" DECIMAL(12,4),
    "liquidityScore" DOUBLE PRECISION,
    "rawPayload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CardPriceSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CardFeatureSnapshot" (
    "id" TEXT NOT NULL,
    "cardId" TEXT NOT NULL,
    "asOfDate" TIMESTAMP(3) NOT NULL,
    "currentPrice" DOUBLE PRECISION,
    "previousPrice" DOUBLE PRECISION,
    "change1d" DOUBLE PRECISION,
    "change7d" DOUBLE PRECISION,
    "change30d" DOUBLE PRECISION,
    "volatility7d" DOUBLE PRECISION,
    "sma7" DOUBLE PRECISION,
    "sma30" DOUBLE PRECISION,
    "trendSlope7d" DOUBLE PRECISION,
    "drawdownFromPeak30d" DOUBLE PRECISION,
    "dataQualityScore" DOUBLE PRECISION,
    "dataPoints" INTEGER NOT NULL DEFAULT 0,
    "liquidityScore" DOUBLE PRECISION,
    "setAgeDays" INTEGER,
    "rarityScore" DOUBLE PRECISION,
    "featurePayload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CardFeatureSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RecommendationSnapshot" (
    "id" TEXT NOT NULL,
    "cardId" TEXT NOT NULL,
    "asOfDate" TIMESTAMP(3) NOT NULL,
    "category" "RecommendationCategory" NOT NULL,
    "ruleScore" DOUBLE PRECISION,
    "modelScore" DOUBLE PRECISION,
    "confidence" DOUBLE PRECISION,
    "dataQualityScore" DOUBLE PRECISION,
    "explanation" TEXT NOT NULL,
    "isModelEnabled" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RecommendationSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WatchlistItem" (
    "id" TEXT NOT NULL,
    "cardId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WatchlistItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SyncRun" (
    "id" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),
    "status" "SyncStatus" NOT NULL DEFAULT 'RUNNING',
    "recordsFetched" INTEGER NOT NULL DEFAULT 0,
    "recordsInserted" INTEGER NOT NULL DEFAULT 0,
    "cardsProcessed" INTEGER NOT NULL DEFAULT 0,
    "errorsCount" INTEGER NOT NULL DEFAULT 0,
    "errorMessage" TEXT,
    "sourceSummary" JSONB,

    CONSTRAINT "SyncRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ModelVersion" (
    "id" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "algorithm" TEXT NOT NULL,
    "metrics" JSONB NOT NULL,
    "artifactPath" TEXT NOT NULL,
    "featureList" JSONB NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "trainedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ModelVersion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Card_externalId_key" ON "Card"("externalId");
CREATE INDEX "Card_name_idx" ON "Card"("name");
CREATE INDEX "Card_setName_idx" ON "Card"("setName");
CREATE INDEX "Card_rarity_idx" ON "Card"("rarity");
CREATE INDEX "Card_setReleaseDate_idx" ON "Card"("setReleaseDate");

CREATE UNIQUE INDEX "CardPriceSnapshot_cardId_source_priceDate_key" ON "CardPriceSnapshot"("cardId", "source", "priceDate");
CREATE INDEX "CardPriceSnapshot_cardId_priceDate_idx" ON "CardPriceSnapshot"("cardId", "priceDate");
CREATE INDEX "CardPriceSnapshot_priceDate_idx" ON "CardPriceSnapshot"("priceDate");
CREATE INDEX "CardPriceSnapshot_source_priceDate_idx" ON "CardPriceSnapshot"("source", "priceDate");

CREATE UNIQUE INDEX "CardFeatureSnapshot_cardId_asOfDate_key" ON "CardFeatureSnapshot"("cardId", "asOfDate");
CREATE INDEX "CardFeatureSnapshot_asOfDate_idx" ON "CardFeatureSnapshot"("asOfDate");
CREATE INDEX "CardFeatureSnapshot_cardId_asOfDate_idx" ON "CardFeatureSnapshot"("cardId", "asOfDate");

CREATE UNIQUE INDEX "RecommendationSnapshot_cardId_asOfDate_key" ON "RecommendationSnapshot"("cardId", "asOfDate");
CREATE INDEX "RecommendationSnapshot_category_asOfDate_idx" ON "RecommendationSnapshot"("category", "asOfDate");
CREATE INDEX "RecommendationSnapshot_cardId_asOfDate_idx" ON "RecommendationSnapshot"("cardId", "asOfDate");

CREATE UNIQUE INDEX "WatchlistItem_cardId_key" ON "WatchlistItem"("cardId");
CREATE INDEX "WatchlistItem_createdAt_idx" ON "WatchlistItem"("createdAt");

CREATE INDEX "SyncRun_startedAt_idx" ON "SyncRun"("startedAt");
CREATE INDEX "SyncRun_status_startedAt_idx" ON "SyncRun"("status", "startedAt");

CREATE UNIQUE INDEX "ModelVersion_version_key" ON "ModelVersion"("version");
CREATE INDEX "ModelVersion_isActive_trainedAt_idx" ON "ModelVersion"("isActive", "trainedAt");

-- AddForeignKey
ALTER TABLE "CardPriceSnapshot" ADD CONSTRAINT "CardPriceSnapshot_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "Card"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CardFeatureSnapshot" ADD CONSTRAINT "CardFeatureSnapshot_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "Card"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RecommendationSnapshot" ADD CONSTRAINT "RecommendationSnapshot_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "Card"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WatchlistItem" ADD CONSTRAINT "WatchlistItem_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "Card"("id") ON DELETE CASCADE ON UPDATE CASCADE;
