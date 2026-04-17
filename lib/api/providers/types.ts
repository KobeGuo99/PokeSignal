export type CardMetadataRecord = {
  externalId: string;
  name: string;
  setName: string;
  setCode: string | null;
  setSeries: string | null;
  setReleaseDate: Date | null;
  number: string | null;
  rarity: string | null;
  supertype: string | null;
  imageUrl: string | null;
  imageLargeUrl: string | null;
  metadata: Record<string, unknown>;
};

export type CardPricingRecord = {
  externalId: string;
  source: "TCGDEX";
  priceDate: Date;
  currency: string;
  marketPrice: number | null;
  lowPrice: number | null;
  midPrice: number | null;
  highPrice: number | null;
  directLowPrice: number | null;
  liquidityScore: number | null;
  rawPayload: Record<string, unknown>;
};
