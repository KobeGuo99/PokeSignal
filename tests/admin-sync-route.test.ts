import { vi } from "vitest";

vi.mock("@/lib/data/sync", () => ({
  runSync: vi.fn(async () => ({
    cardsProcessed: 12,
    recordsInserted: 9,
  })),
}));

import { POST } from "@/app/api/admin/sync/route";
import { runSync } from "@/lib/data/sync";

describe("/api/admin/sync", () => {
  it("runs the sync job and returns a summary", async () => {
    const response = await POST();
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(vi.mocked(runSync)).toHaveBeenCalled();
    expect(payload.message).toContain("Processed 12 cards");
  });
});
