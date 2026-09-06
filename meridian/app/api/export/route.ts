import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** The tables a user can export, and the order they appear in the JSON file. */
const EXPORTABLE = [
  "profiles",
  "financial_profiles",
  "user_settings",
  "income_sources",
  "expenses",
  "savings_accounts",
  "debts",
  "financial_goals",
  "assets",
  "liabilities",
  "net_worth_snapshots",
  "assessments",
  "assessment_answers",
  "score_history",
  "action_plans",
  "milestones",
  "check_ins",
  "notifications",
] as const;

type Exportable = (typeof EXPORTABLE)[number];

const querySchema = z.object({
  format: z.enum(["json", "csv"]).default("json"),
  table: z.enum(EXPORTABLE).optional(),
});

/** RFC 4180 escaping, so a note containing a comma or a quote survives. */
function toCsv(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return "";

  const columns = [...new Set(rows.flatMap((row) => Object.keys(row)))];

  const cell = (value: unknown): string => {
    if (value === null || value === undefined) return "";
    const text =
      typeof value === "object" ? JSON.stringify(value) : String(value);
    return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  };

  return [
    columns.join(","),
    ...rows.map((row) => columns.map((column) => cell(row[column])).join(",")),
  ].join("\r\n");
}

/**
 * Data export (§48).
 *
 * Everything the user owns, in a portable form. Every query is filtered by
 * their own id and RLS applies on top, so this endpoint cannot be turned into
 * a way to read anybody else's records.
 */
export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "You need to be signed in." }, { status: 401 });
  }

  const parsed = querySchema.safeParse({
    format: request.nextUrl.searchParams.get("format") ?? undefined,
    table: request.nextUrl.searchParams.get("table") ?? undefined,
  });

  if (!parsed.success) {
    return NextResponse.json({ error: "That export is not available." }, { status: 400 });
  }

  const supabase = await createClient();
  const stamp = new Date().toISOString().slice(0, 10);

  const fetchTable = async (table: Exportable) => {
    // The owning column differs only for profiles, where it is the primary
    // key. TypeScript cannot narrow the column name against a union of table
    // types, so the filter is cast; the value is always this user's own id and
    // RLS restricts the rows either way.
    const column = table === "profiles" ? "id" : "user_id";
    const { data } = await supabase
      .from(table)
      .select("*")
      .eq(column as never, user.id);
    return (data ?? []) as Record<string, unknown>[];
  };

  // ---- One table as CSV --------------------------------------------------
  if (parsed.data.format === "csv") {
    if (!parsed.data.table) {
      return NextResponse.json(
        { error: "Name a table to export as CSV." },
        { status: 400 },
      );
    }

    const rows = await fetchTable(parsed.data.table);
    return new NextResponse(toCsv(rows), {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="meridian-${parsed.data.table}-${stamp}.csv"`,
        "Cache-Control": "no-store",
      },
    });
  }

  // ---- Everything as JSON ------------------------------------------------
  const data: Record<string, unknown[]> = {};
  for (const table of EXPORTABLE) {
    data[table] = await fetchTable(table);
  }

  const payload = {
    meridian_export: {
      version: 1,
      exported_at: new Date().toISOString(),
      user_id: user.id,
      note: "Every record Meridian holds for this account. Amounts are in the currency recorded on the profile.",
    },
    data,
  };

  return new NextResponse(JSON.stringify(payload, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="meridian-export-${stamp}.json"`,
      "Cache-Control": "no-store",
    },
  });
}
