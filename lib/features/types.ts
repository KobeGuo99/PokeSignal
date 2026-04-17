export type PricePoint = {
  priceDate: Date;
  marketPrice: number;
  liquidityScore: number | null;
};

export type ComputedFeatureSet = {
  asOfDate: Date;
  currentPrice: number | null;
  previousPrice: number | null;
  change1d: number | null;
  change7d: number | null;
  change30d: number | null;
  volatility7d: number | null;
  sma7: number | null;
  sma30: number | null;
  trendSlope7d: number | null;
  drawdownFromPeak30d: number | null;
  dataQualityScore: number;
  dataPoints: number;
  liquidityScore: number | null;
  setAgeDays: number | null;
  rarityScore: number | null;
  featurePayload: Record<string, number | null>;
};
