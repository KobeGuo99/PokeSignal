import { signalConfig } from "@/lib/config/signal-config";
import type { ComputedFeatureSet, PricePoint } from "@/lib/features/types";
import { addCalendarDays, daysBetween, toStartOfDay } from "@/lib/utils/date";
import { average, linearSlope, percentChange, standardDeviation } from "@/lib/utils/math";

type ComputeFeaturesInput = {
  priceHistory: PricePoint[];
  asOfDate?: Date;
  setReleaseDate?: Date | null;
  rarityScore?: number | null;
};

function getPriceOnOrBefore(history: PricePoint[], targetDate: Date): PricePoint | null {
  const target = toStartOfDay(targetDate).getTime();
  const candidate = [...history]
    .reverse()
    .find((snapshot) => toStartOfDay(snapshot.priceDate).getTime() <= target);

  return candidate ?? null;
}

function getWindow(history: PricePoint[], days: number, asOfDate: Date): PricePoint[] {
  const start = addCalendarDays(asOfDate, -days);
  return history.filter((point) => point.priceDate >= start && point.priceDate <= asOfDate);
}

function computeDataQuality(history: PricePoint[], asOfDate: Date): number {
  if (history.length === 0) {
    return 0;
  }

  const window = getWindow(history, signalConfig.history.minimumDays, asOfDate);
  const coverage = Math.min(1, window.length / signalConfig.history.minimumDays);
  const recencyPenalty = Math.min(
    1,
    Math.max(0, daysBetween(asOfDate, history.at(-1)?.priceDate ?? asOfDate)),
  );
  return Math.max(0, Math.min(1, coverage * (1 - recencyPenalty / 10)));
}

export function computeFeatureSnapshot({
  priceHistory,
  asOfDate,
  setReleaseDate,
  rarityScore,
}: ComputeFeaturesInput): ComputedFeatureSet {
  const sortedHistory = [...priceHistory].sort(
    (left, right) => left.priceDate.getTime() - right.priceDate.getTime(),
  );
  const effectiveDate = toStartOfDay(asOfDate ?? sortedHistory.at(-1)?.priceDate ?? new Date());
  const currentPoint = getPriceOnOrBefore(sortedHistory, effectiveDate);
  const previousPoint =
    currentPoint && sortedHistory.length > 1
      ? [...sortedHistory]
          .reverse()
          .find((point) => point.priceDate < currentPoint.priceDate) ?? null
      : null;
  const price1d = getPriceOnOrBefore(sortedHistory, addCalendarDays(effectiveDate, -1));
  const price7d = getPriceOnOrBefore(sortedHistory, addCalendarDays(effectiveDate, -7));
  const price30d = getPriceOnOrBefore(sortedHistory, addCalendarDays(effectiveDate, -30));
  const window7 = getWindow(sortedHistory, 7, effectiveDate);
  const window30 = getWindow(sortedHistory, 30, effectiveDate);

  const returns7 = window7
    .slice(1)
    .map((point, index) => percentChange(point.marketPrice, window7[index].marketPrice))
    .filter((value): value is number => value !== null);

  const currentPrice = currentPoint?.marketPrice ?? null;
  const previousPrice = previousPoint?.marketPrice ?? null;
  const liquidityScore = average(
    window7.map((point) => point.liquidityScore).filter((value): value is number => value !== null),
  );
  const setAgeDays =
    setReleaseDate !== undefined && setReleaseDate !== null
      ? Math.max(0, daysBetween(effectiveDate, setReleaseDate))
      : null;
  const peak30 = Math.max(...window30.map((item) => item.marketPrice), currentPrice ?? 0);
  const drawdown =
    currentPrice !== null && peak30 > 0 ? (currentPrice - peak30) / peak30 : null;

  const computed: ComputedFeatureSet = {
    asOfDate: effectiveDate,
    currentPrice,
    previousPrice,
    change1d: percentChange(currentPrice, price1d?.marketPrice ?? previousPrice),
    change7d: percentChange(currentPrice, price7d?.marketPrice ?? null),
    change30d: percentChange(currentPrice, price30d?.marketPrice ?? null),
    volatility7d: standardDeviation(returns7),
    sma7: average(window7.map((point) => point.marketPrice)),
    sma30: average(window30.map((point) => point.marketPrice)),
    trendSlope7d: linearSlope(window7.map((point) => point.marketPrice)),
    drawdownFromPeak30d: drawdown,
    dataQualityScore: computeDataQuality(sortedHistory, effectiveDate),
    dataPoints: sortedHistory.length,
    liquidityScore,
    setAgeDays,
    rarityScore: rarityScore ?? null,
    featurePayload: {},
  };

  computed.featurePayload = {
    change1d: computed.change1d,
    change7d: computed.change7d,
    change30d: computed.change30d,
    volatility7d: computed.volatility7d,
    sma7: computed.sma7,
    sma30: computed.sma30,
    trendSlope7d: computed.trendSlope7d,
    drawdownFromPeak30d: computed.drawdownFromPeak30d,
    dataQualityScore: computed.dataQualityScore,
    liquidityScore: computed.liquidityScore,
    setAgeDays: computed.setAgeDays,
    rarityScore: computed.rarityScore,
  };

  return computed;
}
