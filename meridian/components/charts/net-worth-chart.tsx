"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { ChartFrame, type ChartSeries } from "./chart-frame";
import { ChartTooltip } from "./chart-tooltip";
import { formatCurrency, formatDate } from "@/lib/format";
import type { NetWorthSnapshotRow } from "@/types/database";

const SERIES: ChartSeries[] = [
  { key: "net_worth", label: "Net worth", color: "var(--chart-1)" },
];

/** Net worth over time (§37). A zero line, because net worth can be negative. */
export function NetWorthChart({
  snapshots,
  currency,
  height = 260,
  className,
}: {
  snapshots: NetWorthSnapshotRow[];
  currency: string;
  height?: number;
  className?: string;
}) {
  const data = snapshots.map((row) => ({
    label: formatDate(row.recorded_at, "month"),
    fullDate: formatDate(row.recorded_at, "long"),
    net_worth: Number(row.net_worth),
  }));

  const hasNegative = data.some((d) => d.net_worth < 0);

  return (
    <ChartFrame
      title="Net worth"
      description={
        data.length < 2
          ? "One reading so far. It is recorded each day you use Meridian, so a line will build."
          : "Everything you own, minus everything you owe."
      }
      series={SERIES}
      rows={data}
      rowLabel="Date"
      height={height}
      className={className}
      format={(_key, value) =>
        typeof value === "number" ? formatCurrency(value, currency) : "—"
      }
    >
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 12, bottom: 4, left: -6 }}>
          <defs>
            <linearGradient id="netWorthFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.28} />
              <stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="label"
            tickLine={false}
            axisLine={false}
            tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
            dy={6}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
            width={72}
            tickFormatter={(value: number) =>
              formatCurrency(value, currency, { compact: true })
            }
          />
          {hasNegative ? (
            <ReferenceLine y={0} stroke="var(--muted-foreground)" strokeWidth={1} />
          ) : null}
          <Tooltip
            cursor={{ stroke: "var(--muted-foreground)", strokeWidth: 1, strokeDasharray: "3 3" }}
            content={
              <ChartTooltip
                formatValue={(value) => formatCurrency(value, currency)}
                renderLabel={(label) =>
                  data.find((d) => d.label === label)?.fullDate ?? label
                }
              />
            }
          />
          <Area
            type="monotone"
            dataKey="net_worth"
            name="Net worth"
            stroke="var(--chart-1)"
            strokeWidth={2}
            fill="url(#netWorthFill)"
            dot={{ r: 3.5, strokeWidth: 2, stroke: "var(--card)", fill: "var(--chart-1)" }}
            activeDot={{ r: 5.5, strokeWidth: 2, stroke: "var(--card)" }}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </ChartFrame>
  );
}
