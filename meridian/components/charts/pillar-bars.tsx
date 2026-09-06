"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from "recharts";

import { ChartFrame, type ChartSeries } from "./chart-frame";
import type { PillarResult } from "@/lib/scoring";

const COLORS: Record<string, string> = {
  spend: "var(--pillar-spend)",
  save: "var(--pillar-save)",
  borrow: "var(--pillar-borrow)",
  plan: "var(--pillar-plan)",
};

const SERIES: ChartSeries[] = [{ key: "score", label: "Score", color: "var(--chart-1)" }];

/**
 * The four pillars side by side.
 *
 * Only four bars, so every one is labelled directly and no legend is needed —
 * the axis names them and the value sits on the bar.
 */
export function PillarBars({
  pillars,
  height = 220,
  className,
}: {
  pillars: PillarResult[];
  height?: number;
  className?: string;
}) {
  const data = pillars.map((p) => ({
    label: p.label,
    key: p.key,
    score: p.score ?? 0,
    measured: p.score !== null,
  }));

  return (
    <ChartFrame
      title="Pillar comparison"
      description="Which part of the score is doing the work, and which is holding it back."
      series={SERIES}
      rows={data.map((d) => ({ label: d.label, score: d.measured ? d.score : null }))}
      rowLabel="Pillar"
      height={height}
      className={className}
      format={(_key, value) => (value === null ? "Not measured" : String(value))}
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 18, right: 8, bottom: 0, left: -20 }}>
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
            ticks={[0, 50, 100]}
            tickLine={false}
            axisLine={false}
            tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
            width={40}
          />
          <Bar dataKey="score" radius={[4, 4, 0, 0]} maxBarSize={64} isAnimationActive={false}>
            {data.map((entry) => (
              <Cell
                key={entry.key}
                fill={entry.measured ? COLORS[entry.key] : "var(--muted)"}
              />
            ))}
            <LabelList
              dataKey="score"
              position="top"
              offset={8}
              fill="var(--foreground)"
              fontSize={12}
              formatter={(value: React.ReactNode) => (Number(value) > 0 ? String(value) : "—")}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </ChartFrame>
  );
}
