"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

import { ChartFrame, type ChartSeries } from "./chart-frame";
import { ChartTooltip } from "./chart-tooltip";
import { formatCurrency, formatPercent } from "@/lib/format";

const RAMP = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
  "var(--chart-6)",
  "var(--chart-7)",
  "var(--chart-8)",
];

export interface CategorySlice {
  label: string;
  value: number;
}

/**
 * Spending by category.
 *
 * Slices are capped at eight: anything past the eighth is folded into "Other"
 * rather than reaching for a ninth hue the palette was never validated for.
 * A 2px surface-coloured gap separates the segments so adjacent fills read as
 * distinct even where the hues are close.
 */
export function CategoryDonut({
  title = "Where your money goes",
  description,
  slices,
  currency,
  height = 280,
  className,
}: {
  title?: string;
  description?: string;
  slices: CategorySlice[];
  currency: string;
  height?: number;
  className?: string;
}) {
  const sorted = [...slices].filter((s) => s.value > 0).sort((a, b) => b.value - a.value);
  const head = sorted.slice(0, 7);
  const tail = sorted.slice(7);
  const data =
    tail.length > 0
      ? [...head, { label: "Other", value: tail.reduce((sum, s) => sum + s.value, 0) }]
      : head;

  const total = data.reduce((sum, s) => sum + s.value, 0);

  const series: ChartSeries[] = data.map((slice, i) => ({
    key: slice.label,
    label: slice.label,
    color: RAMP[i % RAMP.length],
  }));

  const rows = data.map((slice) => ({
    label: slice.label,
    value: slice.value,
    share: total > 0 ? slice.value / total : 0,
  }));

  return (
    <ChartFrame
      title={title}
      description={description}
      series={series}
      rows={rows.map((r) => ({ label: r.label, [r.label]: r.value }))}
      rowLabel="Category"
      height={height}
      className={className}
      format={(_key, value) =>
        typeof value === "number" ? formatCurrency(value, currency) : "—"
      }
    >
      <div className="relative h-full">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="label"
              innerRadius="62%"
              outerRadius="92%"
              paddingAngle={2}
              stroke="var(--card)"
              strokeWidth={2}
              isAnimationActive={false}
            >
              {data.map((slice, i) => (
                <Cell key={slice.label} fill={RAMP[i % RAMP.length]} />
              ))}
            </Pie>
            <Tooltip
              content={
                <ChartTooltip
                  formatValue={(value) =>
                    `${formatCurrency(value, currency)} · ${formatPercent(
                      total > 0 ? value / total : 0,
                    )}`
                  }
                />
              }
            />
          </PieChart>
        </ResponsiveContainer>

        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <p className="text-xs text-muted-foreground">Monthly total</p>
          <p className="text-xl font-semibold tabular tracking-tight">
            {formatCurrency(total, currency, { compact: true })}
          </p>
        </div>
      </div>
    </ChartFrame>
  );
}
