import { prisma } from "@/lib/db/prisma";

export async function addToWatchlist(cardId: string) {
  return prisma.watchlistItem.upsert({
    where: { cardId },
    create: { cardId },
    update: {},
  });
}

export async function removeFromWatchlist(cardId: string) {
  return prisma.watchlistItem.deleteMany({
    where: { cardId },
  });
}
