import { FREQUENCY_PER_YEAR } from "./constants";
import type { Frequency } from "@/types/database";

/**
 * Money, formatted for the user's currency.
 *
 * Falls back to the plain code when a runtime has no data for a currency,
 * so an unusual selection degrades to "1,234 KES" rather than throwing.
 */
export function formatCurrency(
  amount: number,
  currency = "USD",
  options: { compact?: boolean; decimals?: number } = {},
): string {
  const value = Number.isFinite(amount) ? amount : 0;
  const { compact = false, decimals } = options;

  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
      notation: compact && Math.abs(value) >= 10_000 ? "compact" : "standard",
      maximumFractionDigits:
        decimals ?? (compact && Math.abs(value) >= 10_000 ? 1 : value % 1 === 0 ? 0 : 2),
      minimumFractionDigits: decimals ?? 0,
    }).format(value);
  } catch {
    return `${new Intl.NumberFormat(undefined, {
      maximumFractionDigits: decimals ?? 0,
    }).format(value)} ${currency}`;
  }
}

/** A ratio (0.42) as a percentage string ("42%"). */
export function formatPercent(ratio: number | null, decimals = 0): string {
  if (ratio === null || !Number.isFinite(ratio)) return "—";
  return `${(ratio * 100).toFixed(decimals)}%`;
}

export function formatNumber(value: number, decimals = 0): string {
  if (!Number.isFinite(value)) return "—";
  return new Intl.NumberFormat(undefined, {
    maximumFractionDigits: decimals,
    minimumFractionDigits: decimals,
  }).format(value);
}

/** "3.2 months", or "—" when the value could not be measured. */
export function formatMonths(months: number | null): string {
  if (months === null || !Number.isFinite(months)) return "—";
  if (months >= 12) {
    const years = months / 12;
    return `${years.toFixed(1)} year${years === 1 ? "" : "s"}`;
  }
  return `${months.toFixed(1)} month${Math.abs(months - 1) < 0.05 ? "" : "s"}`;
}

/** A signed delta, for score comparisons: "+7", "-3", "no change". */
export function formatDelta(delta: number, unit = ""): string {
  if (delta === 0) return "No change";
  return `${delta > 0 ? "+" : ""}${delta}${unit}`;
}

export function formatDate(
  value: string | Date | null | undefined,
  style: "short" | "long" | "month" = "short",
): string {
  if (!value) return "—";
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "—";

  if (style === "month") {
    return new Intl.DateTimeFormat(undefined, { month: "short", year: "numeric" }).format(date);
  }
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: style === "long" ? "long" : "medium",
  }).format(date);
}

/** Converts an amount at any frequency into its monthly equivalent. */
export function toMonthly(amount: number, frequency: Frequency): number {
  if (!Number.isFinite(amount)) return 0;
  const perYear = FREQUENCY_PER_YEAR[frequency];
  // A one-off has no monthly equivalent and must not inflate a monthly total.
  if (!perYear) return 0;
  return (amount * perYear) / 12;
}

/** Converts an amount at any frequency into its yearly equivalent. */
export function toAnnual(amount: number, frequency: Frequency): number {
  if (!Number.isFinite(amount)) return 0;
  return amount * FREQUENCY_PER_YEAR[frequency];
}
