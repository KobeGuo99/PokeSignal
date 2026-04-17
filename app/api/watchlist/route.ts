import { NextResponse } from "next/server";
import { z } from "zod";

import { addToWatchlist, removeFromWatchlist } from "@/lib/data/watchlist";

const payloadSchema = z.object({
  cardId: z.string().min(1),
});

export async function POST(request: Request) {
  const payload = payloadSchema.parse(await request.json());
  await addToWatchlist(payload.cardId);
  return NextResponse.json({ message: "Added to watchlist." });
}

export async function DELETE(request: Request) {
  const payload = payloadSchema.parse(await request.json());
  await removeFromWatchlist(payload.cardId);
  return NextResponse.json({ message: "Removed from watchlist." });
}
