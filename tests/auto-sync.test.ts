import { describe, expect, it } from "vitest";

import { shouldRunAutomaticSync } from "@/lib/data/auto-sync-helpers";

describe("automatic sync scheduling", () => {
  it("runs when no successful sync exists yet", () => {
    expect(shouldRunAutomaticSync(null, new Date("2026-04-17T12:00:00.000Z"))).toBe(true);
  });

  it("does not rerun when a successful sync already exists for the same day", () => {
    expect(
      shouldRunAutomaticSync(
        new Date("2026-04-17T05:00:00.000Z"),
        new Date("2026-04-17T23:59:59.000Z"),
      ),
    ).toBe(false);
  });

  it("runs again on a later day", () => {
    expect(
      shouldRunAutomaticSync(
        new Date("2026-04-17T05:00:00.000Z"),
        new Date("2026-04-18T12:00:00.000Z"),
      ),
    ).toBe(true);
  });
});
