import "server-only";

import { cache } from "react";

import { createClient } from "@/lib/supabase/server";
import { getFinancialSnapshot, type FinancialSnapshot } from "./records";
import { recordsDifferFromSnapshot } from "@/lib/calculations/fromRecords";
import { readStoredResult, type StoredAssessmentResult } from "@/lib/scoring";
import type { MilestoneRow, NetWorthSnapshotRow } from "@/types/database";

export interface DashboardView {
  snapshot: FinancialSnapshot;
  /**
   * The last completed assessment, read back exactly as it was scored. This is
   * the authoritative score everywhere in the product.
   */
  stored: StoredAssessmentResult | null;
  /**
   * True when the live records no longer match what the last assessment was
   * scored from. The user is asked whether to recalculate; nothing is changed
   * behind their back (§75).
   */
  needsRecalculation: boolean;
  netWorthSnapshots: NetWorthSnapshotRow[];
  milestones: MilestoneRow[];
}

export const getDashboardView = cache(async (userId: string): Promise<DashboardView> => {
  const snapshot = await getFinancialSnapshot(userId);
  const supabase = await createClient();

  const [{ data: netWorthSnapshots }, { data: milestones }] = await Promise.all([
    supabase
      .from("net_worth_snapshots")
      .select("*")
      .eq("user_id", userId)
      .order("recorded_at", { ascending: true })
      .limit(180),
    supabase
      .from("milestones")
      .select("*")
      .eq("user_id", userId)
      .order("achieved_at", { ascending: false }),
  ]);

  const stored = snapshot.latestAssessment
    ? readStoredResult(snapshot.latestAssessment)
    : null;

  return {
    snapshot,
    stored,
    needsRecalculation:
      Boolean(snapshot.latestAssessment) &&
      snapshot.hasRecords &&
      recordsDifferFromSnapshot(
        snapshot.liveInput,
        snapshot.latestAssessment?.input_snapshot,
      ),
    netWorthSnapshots: netWorthSnapshots ?? [],
    milestones: milestones ?? [],
  };
});
