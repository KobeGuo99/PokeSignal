import { execFile } from "child_process";
import { readFile } from "fs/promises";
import { promisify } from "util";

import { prisma } from "@/lib/db/prisma";

const execFileAsync = promisify(execFile);

async function main() {
  await execFileAsync("npx", ["tsx", "scripts/export-training-data.ts"], {
    cwd: process.cwd(),
  });

  await execFileAsync("python3", ["python/training/train_model.py"], {
    cwd: process.cwd(),
  });

  const artifact = JSON.parse(
    await readFile("python/artifacts/current-model.json", "utf8"),
  ) as {
    version: string;
    algorithm: string;
    metrics: Record<string, number>;
    features: string[];
    trained_at: string;
  };

  await prisma.modelVersion.upsert({
    where: {
      version: artifact.version,
    },
    create: {
      version: artifact.version,
      algorithm: artifact.algorithm,
      metrics: artifact.metrics,
      artifactPath: "python/artifacts/current-model.json",
      featureList: artifact.features,
      trainedAt: new Date(artifact.trained_at),
      isActive: true,
    },
    update: {
      algorithm: artifact.algorithm,
      metrics: artifact.metrics,
      artifactPath: "python/artifacts/current-model.json",
      featureList: artifact.features,
      trainedAt: new Date(artifact.trained_at),
      isActive: true,
    },
  });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
