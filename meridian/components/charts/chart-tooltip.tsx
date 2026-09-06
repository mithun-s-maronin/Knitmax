"use client";

import type { TooltipContentProps } from "recharts";

/**
 * The shared tooltip.
 *
 * Values sit in ink, not in the series colour; a small swatch beside each row
 * carries the identity instead, which keeps the text legible in both themes.
 */
export function ChartTooltip({
  active,
  payload,
  label,
  formatValue,
  renderLabel,
}: Partial<TooltipContentProps<number, string>> & {
  formatValue?: (value: number, key: string) => string;
  renderLabel?: (label: string) => string;
}) {
  if (!active || !payload || payload.length === 0) return null;

  return (
    <div className="pointer-events-none rounded-lg border bg-popover px-3 py-2 shadow-lg">
      <p className="text-xs font-medium text-popover-foreground">
        {renderLabel ? renderLabel(String(label)) : String(label)}
      </p>
      <ul className="mt-1.5 space-y-1">
        {payload.map((entry) => (
          <li
            key={String(entry.dataKey)}
            className="flex items-center gap-2 text-xs text-muted-foreground"
          >
            <span
              aria-hidden
              className="size-2.5 shrink-0 rounded-[3px]"
              style={{ background: entry.color }}
            />
            <span className="flex-1">{entry.name}</span>
            <span className="font-medium tabular text-popover-foreground">
              {formatValue
                ? formatValue(Number(entry.value ?? 0), String(entry.dataKey))
                : String(entry.value ?? "—")}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
