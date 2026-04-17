import { signalConfig } from "@/lib/config/signal-config";
import { sleep } from "@/lib/utils/async";
import { logger } from "@/lib/utils/logger";

type FetchJsonOptions = RequestInit & {
  retries?: number;
  retryDelayMs?: number;
  timeoutMs?: number;
};

export async function fetchJson<T>(url: string, options: FetchJsonOptions = {}): Promise<T> {
  const retries = options.retries ?? signalConfig.sync.retryCount;
  const retryDelayMs = options.retryDelayMs ?? signalConfig.sync.retryDelayMs;
  const timeoutMs = options.timeoutMs ?? 15_000;

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
        headers: {
          Accept: "application/json",
          ...options.headers,
        },
        cache: "no-store",
      });

      if (!response.ok) {
        const body = await response.text();
        throw new Error(`HTTP ${response.status} for ${url}: ${body}`);
      }

      return (await response.json()) as T;
    } catch (error) {
      clearTimeout(timeout);

      if (attempt === retries) {
        logger.error("External request failed", {
          url,
          attempt,
          error: error instanceof Error ? error.message : String(error),
        });
        throw error;
      }

      logger.warn("Retrying external request", {
        url,
        attempt,
        error: error instanceof Error ? error.message : String(error),
      });
      await sleep(retryDelayMs * (attempt + 1));
      continue;
    } finally {
      clearTimeout(timeout);
    }
  }

  throw new Error(`Unreachable retry state for ${url}`);
}
