import "server-only";

import { logger } from "@/lib/utils/logger";

const ECB_EURO_FX_REF_URL = "https://www.ecb.europa.eu/stats/eurofxref/eurofxref-daily.xml";
const FX_CACHE_TTL_MS = 6 * 60 * 60 * 1000;

type FxCache = {
  fetchedAt: number;
  eurToUsdRate: number;
};

declare global {
  var __pokesignalFxCache__: FxCache | undefined;
  var __pokesignalFxCachePromise__: Promise<number | null> | undefined;
}

function getFxCache(): FxCache | null {
  const cache = global.__pokesignalFxCache__;

  if (!cache) {
    return null;
  }

  if (Date.now() - cache.fetchedAt > FX_CACHE_TTL_MS) {
    return null;
  }

  return cache;
}

function setFxCache(eurToUsdRate: number) {
  global.__pokesignalFxCache__ = {
    fetchedAt: Date.now(),
    eurToUsdRate,
  };
}

function parseEurToUsdRate(xml: string): number {
  const match = xml.match(/currency=['"]USD['"]\s+rate=['"]([0-9.]+)['"]/i);

  if (!match) {
    throw new Error("ECB USD rate was not found in the XML payload.");
  }

  const parsed = Number(match[1]);

  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error("ECB USD rate was invalid.");
  }

  return parsed;
}

export async function getEurToUsdRate(): Promise<number | null> {
  const cached = getFxCache();

  if (cached) {
    return cached.eurToUsdRate;
  }

  if (global.__pokesignalFxCachePromise__) {
    return global.__pokesignalFxCachePromise__;
  }

  global.__pokesignalFxCachePromise__ = (async () => {
    try {
      const response = await fetch(ECB_EURO_FX_REF_URL, {
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error(`ECB FX request failed with status ${response.status}`);
      }

      const xml = await response.text();
      const rate = parseEurToUsdRate(xml);
      setFxCache(rate);
      return rate;
    } catch (error) {
      logger.warn("Failed to load ECB EUR/USD rate", {
        error: error instanceof Error ? error.message : String(error),
      });
      return null;
    } finally {
      global.__pokesignalFxCachePromise__ = undefined;
    }
  })();

  return global.__pokesignalFxCachePromise__;
}

export async function convertToUsd(
  value: number | null,
  currency: string | null | undefined,
): Promise<number | null> {
  if (value === null) {
    return null;
  }

  if (!currency || currency === "USD") {
    return value;
  }

  if (currency === "EUR") {
    const eurToUsdRate = await getEurToUsdRate();
    return eurToUsdRate === null ? value : value * eurToUsdRate;
  }

  return value;
}

export async function getDisplayCurrency(
  sourceCurrency: string | null | undefined,
): Promise<"USD" | string | null> {
  if (!sourceCurrency || sourceCurrency === "USD") {
    return "USD";
  }

  if (sourceCurrency === "EUR") {
    const eurToUsdRate = await getEurToUsdRate();
    return eurToUsdRate === null ? "EUR" : "USD";
  }

  return sourceCurrency;
}

export async function getUsdDisplayMetadata(sourceCurrency: string | null | undefined) {
  if (!sourceCurrency || sourceCurrency === "USD") {
    return {
      displayCurrency: "USD" as const,
      eurToUsdRate: null,
      convertedFromCurrency: null,
    };
  }

  if (sourceCurrency === "EUR") {
    const eurToUsdRate = await getEurToUsdRate();

    return {
      displayCurrency: eurToUsdRate === null ? "EUR" : ("USD" as const),
      eurToUsdRate,
      convertedFromCurrency: eurToUsdRate === null ? null : "EUR",
    };
  }

  return {
    displayCurrency: sourceCurrency,
    eurToUsdRate: null,
    convertedFromCurrency: null,
  };
}
