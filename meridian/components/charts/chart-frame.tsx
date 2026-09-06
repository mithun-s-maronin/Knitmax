"use client";

import * as React from "react";
import { Table2 } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export interface ChartSeries {
  key: string;
  label: string;
  color: string;
}

/**
 * The shell every chart sits in.
 *
 * It supplies the two things a chart needs to be readable by everyone: a
 * legend, so identity is never carried by colour alone, and a table view of
 * the same numbers, so the chart is never the only way to reach the data.
 */
export function ChartFrame({
  title,
  description,
  series,
  rows,
  rowLabel = "Period",
  format,
  children,
  action,
  className,
  height = 280,
}: {
  title: string;
  description?: string;
  series: ChartSeries[];
  /** The same data the chart draws, for the table view. */
  rows: Array<Record<string, string | number | null>>;
  rowLabel?: string;
  /** Renders a cell value for the table. */
  format?: (key: string, value: string | number | null) => string;
  children: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
  height?: number;
}) {
  const [showTable, setShowTable] = React.useState(false);
  const tableId = React.useId();

  return (
    <section className={cn("surface p-5 sm:p-6", className)} aria-labelledby={`${tableId}-title`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 id={`${tableId}-title`} className="font-semibold">
            {title}
          </h3>
          {description ? (
            <p className="mt-1 text-sm text-muted-foreground text-pretty">{description}</p>
          ) : null}
        </div>
        <div className="no-print flex shrink-0 items-center gap-1.5">
          {action}
          <Button
            variant="ghost"
            size="sm"
            aria-expanded={showTable}
            aria-controls={tableId}
            onClick={() => setShowTable((v) => !v)}
          >
            <Table2 className="size-3.5" />
            {showTable ? "Chart" : "Table"}
          </Button>
        </div>
      </div>

      {series.length > 1 ? (
        <ul className="mt-4 flex flex-wrap gap-x-4 gap-y-1.5">
          {series.map((s) => (
            <li key={s.key} className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span
                aria-hidden
                className="size-2.5 shrink-0 rounded-[3px]"
                style={{ background: s.color }}
              />
              {s.label}
            </li>
          ))}
        </ul>
      ) : null}

      <div id={tableId} className="mt-4">
        {showTable ? (
          <div className="max-h-80 overflow-auto rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{rowLabel}</TableHead>
                  {series.map((s) => (
                    <TableHead key={s.key} className="text-right">
                      {s.label}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row, index) => (
                  <TableRow key={index}>
                    <TableCell className="font-medium">{String(row.label ?? "")}</TableCell>
                    {series.map((s) => (
                      <TableCell key={s.key} className="text-right tabular">
                        {format
                          ? format(s.key, row[s.key] ?? null)
                          : (row[s.key] ?? "—")}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div style={{ height }} className="w-full">
            {children}
          </div>
        )}
      </div>
    </section>
  );
}
