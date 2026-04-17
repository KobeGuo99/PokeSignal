import TCGdex from "@tcgdex/sdk";

import type { CardMetadataRecord, CardPricingRecord } from "@/lib/api/providers/types";
import { env } from "@/lib/env";
import { mapWithConcurrency } from "@/lib/utils/async";

type TcgdexPriceNode = {
  lowPrice?: number | null;
  midPrice?: number | null;
  highPrice?: number | null;
  marketPrice?: number | null;
  directLowPrice?: number | null;
};

type TcgdexCardLike = {
  id: string;
  name?: string | null;
  localId?: string | null;
  category?: string | null;
  rarity?: string | null;
  image?: string | null;
  getImageURL?: (quality?: "high" | "low", extension?: "png" | "webp" | "jpg") => string;
  pricing?: {
    cardmarket?: {
      updated?: string | null;
      unit?: string;
      avg?: number | null;
      low?: number | null;
      trend?: number | null;
      avg1?: number | null;
      avg7?: number | null;
      avg30?: number | null;
    } | null;
    tcgplayer?: {
      updated?: string | null;
      unit?: string;
      normal?: TcgdexPriceNode | null;
      reverse?: TcgdexPriceNode | null;
      holo?: TcgdexPriceNode | null;
    } | null;
  } | null;
  set?: {
    id?: string | null;
    name?: string | null;
    logo?: string | null;
    symbol?: string | null;
  } | null;
};

type TcgdexSetLike = {
  id: string;
  name?: string | null;
  releaseDate?: string | null;
  serie?: {
    id?: string | null;
    name?: string | null;
  } | null;
  cards?: Array<{
    id?: string | null;
  }> | null;
};

type TcgdexSetContext = {
  setName: string;
  setCode: string;
  setSeries: string | null;
  setReleaseDate: Date | null;
};

type TcgdexCardCandidate = {
  cardId: string;
  setContext: TcgdexSetContext;
};

export type TcgdexSyncRecord = {
  metadata: CardMetadataRecord;
  pricing: CardPricingRecord;
};

const allowedEnglishSeries = new Set([
  "Sword & Shield",
  "Scarlet & Violet",
]);

function createTcgdexClient(): TCGdex {
  const client = new TCGdex("en");
  client.setEndpoint(env.TCGDEX_API_URL);
  client.setCacheTTL(300);
  return client;
}

function chooseBestPriceNode(
  pricing: TcgdexCardLike["pricing"],
): {
  marketPrice: number | null;
  lowPrice: number | null;
  midPrice: number | null;
  highPrice: number | null;
  directLowPrice: number | null;
  currency: string;
  provider: "tcgplayer" | "cardmarket" | null;
  updatedAt: string | null;
} {
  const tcgplayer = pricing?.tcgplayer;
  const tcgNode = tcgplayer?.holo ?? tcgplayer?.normal ?? tcgplayer?.reverse;

  if (tcgNode) {
    return {
      marketPrice: tcgNode.marketPrice ?? null,
      lowPrice: tcgNode.lowPrice ?? null,
      midPrice: tcgNode.midPrice ?? null,
      highPrice: tcgNode.highPrice ?? null,
      directLowPrice: tcgNode.directLowPrice ?? null,
      currency: tcgplayer?.unit ?? "USD",
      provider: "tcgplayer",
      updatedAt: tcgplayer?.updated ?? null,
    };
  }

  const cardmarket = pricing?.cardmarket;
  return {
    marketPrice: cardmarket?.avg ?? cardmarket?.trend ?? null,
    lowPrice: cardmarket?.low ?? null,
    midPrice: cardmarket?.avg ?? null,
    highPrice: null,
    directLowPrice: null,
    currency: cardmarket?.unit ?? "EUR",
    provider: cardmarket ? "cardmarket" : null,
    updatedAt: cardmarket?.updated ?? null,
  };
}

function computeLiquidityScore(record: ReturnType<typeof chooseBestPriceNode>): number | null {
  if (
    record.marketPrice === null ||
    record.lowPrice === null ||
    record.highPrice === null ||
    record.marketPrice <= 0
  ) {
    return null;
  }

  const spread = (record.highPrice - record.lowPrice) / record.marketPrice;
  return Math.max(0, Math.min(1, 1 - spread));
}

function isRemoteImageUrl(value: unknown): value is string {
  return typeof value === "string" && /^https?:\/\//.test(value);
}

function getCardImageUrl(card: TcgdexCardLike): string | null {
  if (typeof card.getImageURL === "function") {
    const generatedUrl = card.getImageURL("high", "png");

    if (isRemoteImageUrl(generatedUrl)) {
      return generatedUrl;
    }
  }

  if (isRemoteImageUrl(card.image)) {
    return `${card.image}/high.png`;
  }

  return null;
}

function toPlainCardPayload(card: TcgdexCardLike) {
  return {
    id: card.id,
    name: card.name ?? null,
    localId: card.localId ?? null,
    category: card.category ?? null,
    rarity: card.rarity ?? null,
    image: getCardImageUrl(card),
    set: {
      id: card.set?.id ?? null,
      name: card.set?.name ?? null,
      logo: card.set?.logo ?? null,
      symbol: card.set?.symbol ?? null,
    },
    pricing: card.pricing ?? null,
  };
}

function isAllowedEnglishSet(setDetail: TcgdexSetLike): boolean {
  const seriesName = setDetail.serie?.name ?? null;
  const releaseDate = setDetail.releaseDate ? new Date(setDetail.releaseDate) : null;

  if (seriesName === null || !allowedEnglishSeries.has(seriesName)) {
    return false;
  }

  return releaseDate === null || releaseDate.getTime() <= Date.now();
}

function mapCardMetadata(
  card: TcgdexCardLike,
  setContext?: TcgdexSetContext,
): CardMetadataRecord {
  const imageUrl = getCardImageUrl(card);

  return {
    externalId: card.id,
    name: card.name ?? "Unknown Card",
    setName: card.set?.name ?? setContext?.setName ?? "Unknown Set",
    setCode: card.set?.id ?? setContext?.setCode ?? null,
    setSeries: setContext?.setSeries ?? null,
    setReleaseDate: setContext?.setReleaseDate ?? null,
    number: card.localId ?? null,
    rarity: card.rarity ?? null,
    supertype: card.category ?? null,
    imageUrl,
    imageLargeUrl: imageUrl,
    metadata: {
      provider: "tcgdex",
      cardId: card.id,
      setLogo: card.set?.logo ?? null,
      setSymbol: card.set?.symbol ?? null,
    },
  };
}

function mapCardPricing(card: TcgdexCardLike, priceDate: Date): CardPricingRecord | null {
  const chosen = chooseBestPriceNode(card.pricing);
  const marketPrice =
    chosen.marketPrice ?? chosen.midPrice ?? chosen.lowPrice ?? chosen.highPrice ?? null;

  if (marketPrice === null) {
    return null;
  }

  return {
    externalId: card.id,
    source: "TCGDEX",
    priceDate,
    currency: chosen.currency,
    marketPrice,
    lowPrice: chosen.lowPrice,
    midPrice: chosen.midPrice,
    highPrice: chosen.highPrice,
    directLowPrice: chosen.directLowPrice,
    liquidityScore: computeLiquidityScore(chosen),
    rawPayload: {
      ...toPlainCardPayload(card),
      pricingProvider: chosen.provider,
      pricingUpdatedAt: chosen.updatedAt,
    },
  };
}

async function fetchTcgdexCardDetail(cardId: string): Promise<TcgdexCardLike> {
  const client = createTcgdexClient();
  const card = (await client.card.get(cardId)) as TcgdexCardLike | null;

  if (!card?.id) {
    throw new Error(`TCGdex card not found: ${cardId}`);
  }

  return card;
}

async function listEnglishCardCandidates(limit?: number): Promise<TcgdexCardCandidate[]> {
  const client = createTcgdexClient();
  const setSummaries = (await client.set.list()) as Array<{ id?: string | null }> | null;

  if (!Array.isArray(setSummaries)) {
    return [];
  }

  const groupedCandidates: TcgdexCardCandidate[][] = [];
  const seenCardIds = new Set<string>();

  for (const summary of [...setSummaries].reverse()) {
    if (!summary?.id) {
      continue;
    }

    const setDetail = (await client.set.get(summary.id)) as TcgdexSetLike | null;

    if (!setDetail?.id || !Array.isArray(setDetail.cards) || !isAllowedEnglishSet(setDetail)) {
      continue;
    }

    const setContext: TcgdexSetContext = {
      setName: setDetail.name ?? "Unknown Set",
      setCode: setDetail.id,
      setSeries: setDetail.serie?.name ?? null,
      setReleaseDate: setDetail.releaseDate ? new Date(setDetail.releaseDate) : null,
    };

    const setCandidates: TcgdexCardCandidate[] = [];

    for (const card of [...setDetail.cards].reverse()) {
      if (!card?.id || seenCardIds.has(card.id)) {
        continue;
      }

      seenCardIds.add(card.id);
      setCandidates.push({
        cardId: card.id,
        setContext,
      });
    }

    if (setCandidates.length > 0) {
      groupedCandidates.push(setCandidates);
    }
  }

  const candidates: TcgdexCardCandidate[] = [];
  let hasRemaining = true;

  while (hasRemaining && (limit === undefined || candidates.length < limit)) {
    hasRemaining = false;

    for (const setCandidates of groupedCandidates) {
      const nextCandidate = setCandidates.shift();

      if (!nextCandidate) {
        continue;
      }

      hasRemaining = true;
      candidates.push(nextCandidate);

      if (limit !== undefined && candidates.length >= limit) {
        return candidates;
      }
    }
  }

  return candidates;
}

export async function fetchTcgdexSyncRecords(
  limit: number,
  priceDate: Date,
): Promise<TcgdexSyncRecord[]> {
  const candidates = await listEnglishCardCandidates();
  const records: TcgdexSyncRecord[] = [];
  const chunkSize = Math.max(1, env.SYNC_PAGE_SIZE);

  for (let index = 0; index < candidates.length && records.length < limit; index += chunkSize) {
    const chunk = candidates.slice(index, index + chunkSize);
    const chunkResults = await mapWithConcurrency(chunk, 4, async (candidate) => {
      const card = await fetchTcgdexCardDetail(candidate.cardId);
      const pricing = mapCardPricing(card, priceDate);

      if (!pricing) {
        return null;
      }

      return {
        metadata: mapCardMetadata(card, candidate.setContext),
        pricing,
      } satisfies TcgdexSyncRecord;
    });

    for (const result of chunkResults) {
      if (!result) {
        continue;
      }

      records.push(result);

      if (records.length >= limit) {
        break;
      }
    }
  }

  return records;
}

export async function fetchTcgdexCardMetadata(
  limit = env.SYNC_CARD_LIMIT,
): Promise<CardMetadataRecord[]> {
  const candidates = await listEnglishCardCandidates(limit);
  const detailedCards = await mapWithConcurrency(candidates, 4, async (candidate) => {
    const card = await fetchTcgdexCardDetail(candidate.cardId);
    return mapCardMetadata(card, candidate.setContext);
  });

  return detailedCards;
}

export async function fetchTcgdexPricing(
  externalId: string,
  priceDate: Date,
): Promise<CardPricingRecord | null> {
  const card = await fetchTcgdexCardDetail(externalId);
  return mapCardPricing(card, priceDate);
}
