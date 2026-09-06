import {
  SCORE_RANGES,
  SCORE_STATUS_LABELS,
  type ScoreStatusKey,
} from "./scoreConfig";

export interface ScoreStatus {
  key: ScoreStatusKey;
  label: string;
  /** The mark colour, for gauges and bars. Not for text. */
  colorVar: string;
  /**
   * The text colour: the ink variant of the same ramp entry, which clears
   * 4.5:1 against both surfaces. The mark colour only clears 3:1 and must
   * never be used for type.
   */
  textClass: string;
  bgClass: string;
  borderClass: string;
}

const STATUS_STYLES: Record<
  ScoreStatusKey,
  Omit<ScoreStatus, "key" | "label">
> = {
  excellent: {
    colorVar: "var(--score-excellent)",
    textClass: "text-score-excellent-ink",
    bgClass: "bg-score-excellent/12",
    borderClass: "border-score-excellent/30",
  },
  good: {
    colorVar: "var(--score-good)",
    textClass: "text-score-good-ink",
    bgClass: "bg-score-good/12",
    borderClass: "border-score-good/30",
  },
  fair: {
    colorVar: "var(--score-fair)",
    textClass: "text-score-fair-ink",
    bgClass: "bg-score-fair/14",
    borderClass: "border-score-fair/35",
  },
  needsImprovement: {
    colorVar: "var(--score-needs-improvement)",
    textClass: "text-score-needs-improvement-ink",
    bgClass: "bg-score-needs-improvement/12",
    borderClass: "border-score-needs-improvement/30",
  },
  critical: {
    colorVar: "var(--score-critical)",
    textClass: "text-score-critical-ink",
    bgClass: "bg-score-critical/12",
    borderClass: "border-score-critical/30",
  },
};

/** The band a 0-100 score falls into. */
export function getScoreStatus(score: number): ScoreStatus {
  const value = Math.round(Math.min(Math.max(score, 0), 100));

  const key: ScoreStatusKey =
    value >= SCORE_RANGES.excellent.min
      ? "excellent"
      : value >= SCORE_RANGES.good.min
        ? "good"
        : value >= SCORE_RANGES.fair.min
          ? "fair"
          : value >= SCORE_RANGES.needsImprovement.min
            ? "needsImprovement"
            : "critical";

  return { key, label: SCORE_STATUS_LABELS[key], ...STATUS_STYLES[key] };
}

/** A short, plain-language reading of a score. */
export function getScoreSummary(score: number): string {
  const { key } = getScoreStatus(score);
  switch (key) {
    case "excellent":
      return "Your finances are in strong shape across the board. The work now is protecting what you have built.";
    case "good":
      return "You are in good shape, with one or two areas that would repay attention.";
    case "fair":
      return "The foundations are there, but a few things are holding you back from where you could be.";
    case "needsImprovement":
      return "Several parts of your finances are under strain. A small number of changes would move this a long way.";
    case "critical":
      return "Your finances are stretched. Start with the highest-priority action below — it matters more than the score itself.";
  }
}
