import { execFile } from "child_process";
import { promisify } from "util";

import { NextResponse } from "next/server";

const execFileAsync = promisify(execFile);

export async function POST() {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json(
      { message: "Training route is disabled in production. Use the scheduled CLI job instead." },
      { status: 501 },
    );
  }

  const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";
  await execFileAsync(npmCommand, ["run", "model:train"], {
    cwd: process.cwd(),
  });

  return NextResponse.json({
    message: "Model training completed and the latest artifact was registered.",
  });
}
