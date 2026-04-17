import { runSync } from "@/lib/data/sync";

async function main() {
  const result = await runSync();
  console.info(JSON.stringify(result, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
