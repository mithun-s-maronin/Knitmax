import { roundScore, round } from "./helpers";
import type { ComponentResult } from "./types";

/**
 * Combines weighted components into a pillar score.
 *
 * Components that could not be measured are excluded and the remaining
 * weights are renormalised, so a person is never scored down for a question
 * that does not apply to them or a ratio their data cannot support (§11).
 * When nothing could be measured the pillar score is null, not zero.
 */
export function combineComponents(components: ComponentResult[]): {
  score: number | null;
  components: ComponentResult[];
} {
  const measurable = components.filter(
    (c) => c.status === "ok" && c.score !== null,
  );
  const measurableWeight = measurable.reduce((sum, c) => sum + c.weight, 0);

  if (measurable.length === 0 || measurableWeight <= 0) {
    return {
      score: null,
      components: components.map((c) => ({
        ...c,
        effectiveWeight: 0,
        contribution: null,
      })),
    };
  }

  const resolved = components.map((c) => {
    if (c.status !== "ok" || c.score === null) {
      return { ...c, effectiveWeight: 0, contribution: null };
    }
    const effectiveWeight = c.weight / measurableWeight;
    return {
      ...c,
      effectiveWeight: round(effectiveWeight, 4),
      contribution: round(c.score * effectiveWeight, 2),
    };
  });

  const raw = resolved.reduce(
    (sum, c) =>
      c.score !== null && c.effectiveWeight > 0
        ? sum + c.score * (c.weight / measurableWeight)
        : sum,
    0,
  );

  return { score: roundScore(raw), components: resolved };
}
