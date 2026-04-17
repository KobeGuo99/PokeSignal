import { NextResponse } from "next/server";

import { runSync } from "@/lib/data/sync";

export async function POST() {
  const result = await runSync();
  return NextResponse.json({
    message: `Sync completed. Processed ${result.cardsProcessed} cards and stored ${result.recordsInserted} pricing rows.`,
  });
}

export const maxDuration = 300;
