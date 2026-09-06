"use client";

import * as React from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { ChartFrame, type ChartSeries } from "./chart-frame";
import { ChartTooltip } from "./chart-tooltip";
import { formatDate } from "@/lib/format";
import type { ScoreHistoryRow } from "@/types/database";

const PILLAR_SERIES: ChartSeries[] = [
  { key: "overall_score", label: "Overall", color: "var(--foreground)" },
  { key: "spend_score", label: "Spend", color: "var(--pillar-spend)" },
  { key: "save_score", label: "Save", color: "var(--pillar-save)" },
  { key: "borrow_score", label: "Borrow", color: "var(--pillar-borrow)" },
  { key: "plan_score", label: "Plan", color: "var(--pillar-plan)" },
];

/**
 * Score over time (§31).
 *
 * A single y-scale, always 0-100, so the shape of the line means what it looks
 * like it means. Points are drawn at 8px so they are hittable, and the whole
 * series is available as a table.
 */
export function ScoreHistoryChart({
  history,
  showPillars = true,
  height = 300,
  className,
}: {
  history: ScoreHistoryRow[];
  showPillars?: boolean;
  height?: number;
  className?: string;
}) {
  const [withPillars, setWithPillars] = React.useState(false);

  const data = history.map((row) => ({
    label: formatDate(row.recorded_at, "month"),
    fullDate: formatDate(row.recorded_at, "long"),
    overall_score: row.overall_score,
    spend_score: row.spend_score,
    save_score: row.save_score,
    borrow_score: row.borrow_score,
    plan_score: row.plan_score,
  }));

  const series = withPillars ? PILLAR_SERIES : [PILLAR_SERIES[0]];

  return (
    <ChartFrame
      title="Your score over time"
      description={
        history.length < 2
          ? "One point so far. Take another assessment and the trend appears here."
          : "Every completed assessment, kept exactly as it was scored."
      }
      series={series}
      rows={data}
      rowLabel="Assessment"
      height={height}
      className={className}
      action={
        showPillars && history.length > 0 ? (
          <button
            type="button"
            onClick={() => setWithPillars((v) => !v)}
            aria-pressed={withPillars}
            className="rounded-md px-2 py-1 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            {withPillars ? "Overall only" : "Show pillars"}
          </button>
        ) : null
      }
    >
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 12, bottom: 4, left: -18 }}>
          <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="label"
            tickLine={false}
            axisLine={false}
            tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
            dy={6}
          />
          <YAxis
            domain={[0, 100]}
            ticks={[0, 25, 50, 75, 100]}
            tickLine={false}
            axisLine={false}
            tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
            width={44}
          />
          <Tooltip
            cursor={{ stroke: "var(--muted-foreground)", strokeWidth: 1, strokeDasharray: "3 3" }}
            content={
              <ChartTooltip
                renderLabel={(label) =>
                  data.find((d) => d.label === label)?.fullDate ?? label
                }
              />
            }
          />
          {series.map((s) => (
            <Line
              key={s.key}
              type="monotone"
              dataKey={s.key}
              name={s.label}
              stroke={s.color}
              strokeWidth={s.key === "overall_score" ? 2.5 : 2}
              dot={{ r: 4, strokeWidth: 2, stroke: "var(--card)", fill: s.color }}
              activeDot={{ r: 5.5, strokeWidth: 2, stroke: "var(--card)" }}
              connectNulls
              isAnimationActive={false}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </ChartFrame>
  );
}
