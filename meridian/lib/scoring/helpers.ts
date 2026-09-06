/**
 * Numeric helpers shared by every scoring calculation.
 *
 * Nothing in the scoring engine divides directly: every ratio goes through
 * safeDivide, which reports an undefined result rather than returning
 * Infinity or NaN and quietly poisoning a score.
 */

/** Constrains a value to a range. */
export const clamp = (value: number, min: number, max: number): number =>
  Math.min(Math.max(value, min), max);

/**
 * Division that refuses to invent an answer.
 *
 * Returns `fallback` (0 by default) when the denominator is zero or negative,
 * which is what makes a zero-income profile produce "insufficient data"
 * instead of a made-up ratio.
 */
export const safeDivide = (
  numerator: number,
  denominator: number,
  fallback = 0,
): number => {
  if (!Number.isFinite(numerator) || !Number.isFinite(denominator)) return fallback;
  if (denominator <= 0) return fallback;
  return numerator / denominator;
};

/**
 * Division that says so when it cannot divide.
 *
 * The engine uses this where the difference between "zero" and "unknown"
 * changes the result.
 */
export const divideOrNull = (
  numerator: number,
  denominator: number,
): number | null => {
  if (!Number.isFinite(numerator) || !Number.isFinite(denominator)) return null;
  if (denominator <= 0) return null;
  return numerator / denominator;
};

/** Rounds to a whole number, clamped into the 0-100 score range. */
export const roundScore = (value: number): number =>
  Math.round(clamp(value, 0, 100));

/** Rounds to `places` decimals without float drift showing up in the UI. */
export const round = (value: number, places = 2): number => {
  const factor = 10 ** places;
  return Math.round((value + Number.EPSILON) * factor) / factor;
};

/** A finite, non-negative number, or 0. */
export const toAmount = (value: unknown): number => {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) && n > 0 ? n : 0;
};
