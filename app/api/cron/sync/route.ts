import { after, NextResponse } from "next/server";

import { signalConfig } from "@/lib/config/signal-config";
import { runSync } from "@/lib/data/sync";
import { env } from "@/lib/env";
import { logger } from "@/lib/utils/logger";

function isAuthorized(request: Request) {
  if (!env.CRON_SECRET) {
    return true;
  }

  const authHeader = request.headers.get("authorization");
  return authHeader === `Bearer ${env.CRON_SECRET}`;
}

function parseChainDepth(request: Request): number {
  const rawValue = new URL(request.url).searchParams.get("chainDepth");
  const parsed = rawValue ? Number(rawValue) : 0;
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : 0;
}

function parseSyncDate(request: Request): Date {
  const rawValue = new URL(request.url).searchParams.get("syncDate");

  if (!rawValue) {
    return new Date();
  }

  const parsed = new Date(rawValue);
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
}

function buildContinuationUrl(syncDate: Date, chainDepth: number): string {
  const url = new URL("/api/cron/sync", env.APP_URL);
  url.searchParams.set("syncDate", syncDate.toISOString());
  url.searchParams.set("chainDepth", String(chainDepth));
  return url.toString();
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const syncDate = parseSyncDate(request);
  const chainDepth = parseChainDepth(request);
  const result = await runSync(syncDate, {
    maxBatches: signalConfig.sync.maxBatchesPerInvocation,
  });
  const shouldContinue =
    !result.isComplete && chainDepth < signalConfig.sync.maxChainDepth;

  if (shouldContinue) {
    const continuationUrl = buildContinuationUrl(syncDate, chainDepth + 1);

    after(async () => {
      try {
        await fetch(continuationUrl, {
          method: "POST",
          headers: env.CRON_SECRET
            ? {
                authorization: `Bearer ${env.CRON_SECRET}`,
              }
            : undefined,
          cache: "no-store",
        });
      } catch (error) {
        logger.error("Failed to schedule sync continuation", {
          continuationUrl,
          chainDepth: chainDepth + 1,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    });
  }

  return NextResponse.json({
    ...result,
    syncDate: syncDate.toISOString(),
    chainDepth,
    continuationScheduled: shouldContinue,
  });
}

export const POST = GET;
export const maxDuration = 300;
