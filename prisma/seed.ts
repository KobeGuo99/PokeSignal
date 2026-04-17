import { prisma } from "@/lib/db/prisma";
import { runSync } from "@/lib/data/sync";

async function main() {
  await prisma.watchlistItem.deleteMany();
  await prisma.recommendationSnapshot.deleteMany();
  await prisma.cardFeatureSnapshot.deleteMany();
  await prisma.cardPriceSnapshot.deleteMany();
  await prisma.card.deleteMany();
  await prisma.syncRun.deleteMany();

  await runSync();
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
