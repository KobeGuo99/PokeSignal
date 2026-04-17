import { formatDistanceToNow } from "date-fns";

export function formatCurrency(value: number | null | undefined, currency = "USD"): string {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return "N/A";
  }

  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      minimumFractionDigits: value >= 100 ? 0 : 2,
      maximumFractionDigits: 2,
    }).format(value);
  } catch {
    return `${value.toFixed(value >= 100 ? 0 : 2)} ${currency}`.trim();
  }
}

export function formatPercent(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return "N/A";
  }

  return `${value >= 0 ? "+" : ""}${(value * 100).toFixed(1)}%`;
}

export function formatRelativeTime(date: Date | null | undefined): string {
  if (!date) {
    return "Never";
  }

  return formatDistanceToNow(date, { addSuffix: true });
}
