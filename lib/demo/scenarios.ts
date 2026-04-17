import { subDays } from "date-fns";

type DemoScenario = {
  externalId: string;
  name: string;
  setName: string;
  setCode: string;
  rarity: string;
  imageUrl: string;
  imageLargeUrl: string;
  setReleaseDate: Date;
  prices: number[];
};

const today = new Date("2026-04-17T00:00:00.000Z");

function buildDates(length: number): Date[] {
  return Array.from({ length }, (_, index) => subDays(today, length - 1 - index));
}

export const demoScenarios: DemoScenario[] = [
  {
    externalId: "sv08.5-161",
    name: "Umbreon ex",
    setName: "Prismatic Evolutions",
    setCode: "sv08.5",
    rarity: "Special illustration rare",
    imageUrl: "https://assets.tcgdex.net/en/sv/sv08.5/161/high.png",
    imageLargeUrl: "https://assets.tcgdex.net/en/sv/sv08.5/161/high.png",
    setReleaseDate: new Date("2025-01-17T00:00:00.000Z"),
    prices: [
      188, 189, 191, 194, 197, 199, 201, 204, 208, 210, 213, 216, 219, 221, 224,
      227, 230, 232, 234, 236, 239, 242, 245, 248, 250, 246, 241, 236, 231, 228,
      224, 221, 218, 214, 211, 208, 206, 224, 220, 216, 212, 208, 204, 200, 196,
    ],
  },
  {
    externalId: "swsh8-157",
    name: "Gengar VMAX",
    setName: "Fusion Strike",
    setCode: "swsh8",
    rarity: "Holo Rare VMAX",
    imageUrl: "https://assets.tcgdex.net/en/swsh/swsh8/157/high.png",
    imageLargeUrl: "https://assets.tcgdex.net/en/swsh/swsh8/157/high.png",
    setReleaseDate: new Date("2021-11-12T00:00:00.000Z"),
    prices: [
      168, 166, 165, 163, 161, 160, 158, 156, 154, 151, 149, 147, 145, 141, 138,
      134, 131, 127, 124, 120, 118, 116, 113, 110, 108, 104, 101, 99, 95, 92, 89,
      86, 82, 79, 76, 74, 72, 70, 68, 66, 63, 61, 59, 57, 55,
    ],
  },
  {
    externalId: "sv08-219",
    name: "Pikachu ex",
    setName: "Surging Sparks",
    setCode: "sv08",
    rarity: "Ultra Rare",
    imageUrl: "https://assets.tcgdex.net/en/sv/sv08/219/high.png",
    imageLargeUrl: "https://assets.tcgdex.net/en/sv/sv08/219/high.png",
    setReleaseDate: new Date("2024-11-08T00:00:00.000Z"),
    prices: [
      29, 29.1, 29.2, 29.5, 29.8, 30.1, 30.3, 30.8, 31.1, 31.4, 31.7, 32, 32.2,
      32.4, 32.8, 33.1, 33.6, 34.1, 34.3, 34.8, 35.2, 35.6, 36, 36.3, 36.9, 37.3,
      37.6, 38.1, 38.4, 38.8, 39.3, 39.9, 40.4, 40.8, 41.2, 41.6, 42.1, 42.5, 43,
      43.6, 44.1, 44.7, 45.4, 46.2, 46.8,
    ],
  },
  {
    externalId: "sv03.5-193",
    name: "Mew ex",
    setName: "151",
    setCode: "sv03.5",
    rarity: "Ultra Rare",
    imageUrl: "https://assets.tcgdex.net/en/sv/sv03.5/193/high.png",
    imageLargeUrl: "https://assets.tcgdex.net/en/sv/sv03.5/193/high.png",
    setReleaseDate: new Date("2023-09-22T00:00:00.000Z"),
    prices: [
      17.4, 17.1, 17.5, 17.2, 17.4, 17.8, 17.6, 17.3, 17.5, 17.7, 17.2, 17.4, 17.8,
      17.6, 17.1, 17.3, 17.6, 17.4, 17.5, 17.7, 17.3, 17.2, 17.5, 17.6, 17.4, 17.1,
      17.3, 17.5, 17.2, 17.4, 17.7, 17.5, 17.2, 17.4, 17.6, 17.3, 17.2, 17.5, 17.6,
      17.4, 17.3, 17.6, 17.4, 17.2, 17.4,
    ],
  },
  {
    externalId: "sv06-214",
    name: "Greninja ex",
    setName: "Twilight Masquerade",
    setCode: "sv06",
    rarity: "Rare",
    imageUrl: "https://assets.tcgdex.net/en/sv/sv06/214/high.png",
    imageLargeUrl: "https://assets.tcgdex.net/en/sv/sv06/214/high.png",
    setReleaseDate: new Date("2024-05-24T00:00:00.000Z"),
    prices: [12.4, 12.2, 12.1, 12.3, 12.2, 12.4, 12.1, 12.0, 11.8, 11.9],
  },
];

export function getScenarioHistory(externalId: string) {
  const scenario = demoScenarios.find((entry) => entry.externalId === externalId);

  if (!scenario) {
    return [];
  }

  return buildDates(scenario.prices.length).map((date, index) => ({
    priceDate: date,
    marketPrice: scenario.prices[index],
    liquidityScore: 0.65,
  }));
}
