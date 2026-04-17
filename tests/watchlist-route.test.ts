import { vi } from "vitest";

vi.mock("@/lib/data/watchlist", () => ({
  addToWatchlist: vi.fn(async () => ({ id: "watch-1" })),
  removeFromWatchlist: vi.fn(async () => ({ count: 1 })),
}));

import { DELETE, POST } from "@/app/api/watchlist/route";
import { addToWatchlist, removeFromWatchlist } from "@/lib/data/watchlist";

describe("/api/watchlist", () => {
  it("adds a card to the watchlist", async () => {
    const response = await POST(
      new Request("http://localhost/api/watchlist", {
        method: "POST",
        body: JSON.stringify({ cardId: "card-1" }),
        headers: { "Content-Type": "application/json" },
      }),
    );

    expect(response.status).toBe(200);
    expect(vi.mocked(addToWatchlist)).toHaveBeenCalledWith("card-1");
  });

  it("removes a card from the watchlist", async () => {
    const response = await DELETE(
      new Request("http://localhost/api/watchlist", {
        method: "DELETE",
        body: JSON.stringify({ cardId: "card-1" }),
        headers: { "Content-Type": "application/json" },
      }),
    );

    expect(response.status).toBe(200);
    expect(vi.mocked(removeFromWatchlist)).toHaveBeenCalledWith("card-1");
  });
});
