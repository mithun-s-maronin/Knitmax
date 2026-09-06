/**
 * The scoring version registry (§12, §76).
 *
 * A completed assessment records the scoring_version that produced it. When
 * that assessment is opened again — a year and two formula revisions later —
 * it is read through the engine registered for its own version, so a stored
 * score is never recomputed by rules that did not exist when it was taken.
 *
 * When the formulas change:
 *   1. Copy the current engine to lib/scoring/versions/v1_0.ts, frozen.
 *   2. Bump SCORING_VERSION in scoreConfig.ts.
 *   3. Register the frozen copy under "v1.0" below, and the live engine under
 *      the new version.
 *
 * Historical rows are never rewritten, and the stored breakdown means an old
 * assessment can be explained in full even without re-running anything.
 */

import { SCORING_VERSION } from "./scoreConfig";
import { scoreFinancialHealth } from "./index";
import type { FinancialHealthResult, ScoringInput } from "./types";

export type ScoringEngine = (input: ScoringInput) => FinancialHealthResult;

const ENGINES: Record<string, ScoringEngine> = {
  "v1.0": scoreFinancialHealth,
};

/** The engine that produced a given version, or null if it is unknown. */
export function getEngine(version: string): ScoringEngine | null {
  return ENGINES[version] ?? null;
}

/** The engine new assessments are scored with. */
export function getCurrentEngine(): ScoringEngine {
  return ENGINES[SCORING_VERSION];
}

export function isKnownScoringVersion(version: string): boolean {
  return version in ENGINES;
}
