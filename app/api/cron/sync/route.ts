import { NextResponse } from "next/server";

import { runSync } from "@/lib/data/sync";
import { env } from "@/lib/env";

function isAuthorized(request: Request) {
  if (!env.CRON_SECRET) {
    return true;
  }

  const authHeader = request.headers.get("authorization");
  return authHeader === `Bearer ${env.CRON_SECRET}`;
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const result = await runSync(new Date(), { maxBatches: 1 });
  return NextResponse.json(result);
}

export const POST = GET;
export const maxDuration = 300;
