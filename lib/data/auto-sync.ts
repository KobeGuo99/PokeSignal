import "server-only";

import { SyncStatus } from "@prisma/client";

import { shouldRunAutomaticSync } from "@/lib/data/auto-sync-helpers";
import { prisma } from "@/lib/db/prisma";
import { env } from "@/lib/env";
import { runSync } from "@/lib/data/sync";
import { logger } from "@/lib/utils/logger";

type AutoSyncState = {
  initialized: boolean;
  intervalId: NodeJS.Timeout | null;
  isRunning: boolean;
};

declare global {
  var __pokesignalAutoSync__: AutoSyncState | undefined;
}

function getAutoSyncState(): AutoSyncState {
  if (!global.__pokesignalAutoSync__) {
    global.__pokesignalAutoSync__ = {
      initialized: false,
      intervalId: null,
      isRunning: false,
    };
  }

  return global.__pokesignalAutoSync__;
}

async function runAutomaticSyncIfStale(reason: "startup" | "interval") {
  const state = getAutoSyncState();

  if (state.isRunning) {
    return;
  }

  state.isRunning = true;

  try {
    const latestSuccessfulSync = await prisma.syncRun.findFirst({
      where: {
        status: SyncStatus.SUCCESS,
      },
      orderBy: {
        finishedAt: "desc",
      },
    });

    const lastSyncAt = latestSuccessfulSync?.finishedAt ?? latestSuccessfulSync?.startedAt ?? null;
    const now = new Date();

    if (!shouldRunAutomaticSync(lastSyncAt, now)) {
      return;
    }

    logger.info("Starting automatic sync", {
      reason,
      lastSyncAt: lastSyncAt?.toISOString() ?? null,
    });

    const result = await runSync(now);

    logger.info("Automatic sync completed", {
      reason,
      cardsProcessed: result.cardsProcessed,
      recordsInserted: result.recordsInserted,
      recordsFetched: result.recordsFetched,
    });
  } catch (error) {
    logger.error("Automatic sync failed", {
      reason,
      error: error instanceof Error ? error.message : String(error),
    });
  } finally {
    state.isRunning = false;
  }
}

export function ensureAutomaticSyncStarted() {
  if (!env.AUTO_SYNC_ENABLED || process.env.NODE_ENV === "test") {
    return;
  }

  const state = getAutoSyncState();

  if (state.initialized) {
    return;
  }

  state.initialized = true;

  logger.info("Automatic sync scheduler started", {
    checkIntervalMinutes: env.AUTO_SYNC_CHECK_INTERVAL_MINUTES,
  });

  void runAutomaticSyncIfStale("startup");

  state.intervalId = setInterval(() => {
    void runAutomaticSyncIfStale("interval");
  }, env.AUTO_SYNC_CHECK_INTERVAL_MINUTES * 60 * 1000);

  state.intervalId.unref?.();
}
