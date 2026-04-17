import { beforeEach, describe, expect, it, vi } from "vitest";

const mockCardGet = vi.fn();
const mockSetGet = vi.fn();
const mockSetList = vi.fn();

vi.mock("@tcgdex/sdk", () => {
  return {
    __esModule: true,
    default: class MockTCGdex {
      card = {
        get: mockCardGet,
      };

      set = {
        get: mockSetGet,
        list: mockSetList,
      };

      setEndpoint() {}

      setCacheTTL() {}
    },
  };
});

import { fetchTcgdexCardMetadata, fetchTcgdexPricing } from "@/lib/api/providers/tcgdex";

describe("provider mapping", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("maps TCGdex metadata safely", async () => {
    mockSetList.mockResolvedValue([{ id: "swsh3" }]);
    mockSetGet.mockResolvedValue({
      id: "swsh3",
      name: "Darkness Ablaze",
      releaseDate: "2020-08-14",
      serie: {
        id: "swsh",
        name: "Sword & Shield",
      },
      cards: [{ id: "swsh3-136" }],
    });
    mockCardGet.mockResolvedValue({
      id: "swsh3-136",
      name: "Furret",
      localId: "136",
      category: "Pokemon",
      rarity: "Uncommon",
      image: "https://assets.tcgdex.net/en/swsh/swsh3/136",
      set: {
        id: "swsh3",
        name: "Darkness Ablaze",
      },
      pricing: {},
    });

    const rows = await fetchTcgdexCardMetadata(1);
    expect(rows[0]).toMatchObject({
      externalId: "swsh3-136",
      name: "Furret",
      setName: "Darkness Ablaze",
      rarity: "Uncommon",
    });
  });

  it("maps TCGdex price payloads and picks a usable market price", async () => {
    mockCardGet.mockResolvedValue({
      id: "sv1-1",
      pricing: {
        tcgplayer: {
          unit: "USD",
          normal: {
            lowPrice: 1.1,
            midPrice: 1.4,
            highPrice: 2.3,
            marketPrice: 1.6,
            directLowPrice: 1.3,
          },
        },
      },
    });

    const row = await fetchTcgdexPricing("sv1-1", new Date("2026-04-17T00:00:00.000Z"));
    expect(row?.marketPrice).toBeCloseTo(1.6, 4);
    expect(row?.currency).toBe("USD");
  });
});
