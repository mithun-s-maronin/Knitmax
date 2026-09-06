"use client";

import * as React from "react";

import { cn } from "@/lib/utils";
import { CURRENCIES } from "@/lib/constants";

/**
 * An amount field.
 *
 * The value is held as a string while typing so a half-entered "1." is not
 * destroyed, and reported as a number so the caller never has to parse. The
 * currency symbol sits inside the field as a prefix rather than in the label,
 * which keeps the association obvious on a narrow screen.
 */
export function CurrencyInput({
  id,
  value,
  currency,
  onChange,
  invalid,
  describedBy,
  placeholder = "0",
}: {
  id: string;
  value: number | string | null;
  currency: string;
  onChange: (value: number | null) => void;
  invalid?: boolean;
  describedBy?: string;
  placeholder?: string;
}) {
  const symbol =
    CURRENCIES.find((c) => c.code === currency)?.symbol ?? currency;

  const [text, setText] = React.useState(
    value === null || value === undefined ? "" : String(value),
  );

  // Keep in step when the value is changed from outside — a restored draft,
  // say. Adjusted during render rather than in an effect, which is React's
  // documented way to react to a prop change without a second render pass.
  const [lastValue, setLastValue] = React.useState(value);
  if (value !== lastValue) {
    setLastValue(value);
    const incoming = value === null || value === undefined ? "" : String(value);
    if (Number(text || Number.NaN) !== Number(incoming || Number.NaN)) {
      setText(incoming);
    }
  }

  return (
    <div className="relative">
      <span
        aria-hidden
        className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-medium text-muted-foreground"
      >
        {symbol}
      </span>
      <input
        id={id}
        type="text"
        inputMode="decimal"
        autoComplete="off"
        value={text}
        placeholder={placeholder}
        aria-invalid={invalid || undefined}
        aria-describedby={describedBy}
        onChange={(event) => {
          const next = event.target.value.replace(/[^0-9.]/g, "");
          // At most one decimal point.
          const cleaned = next.split(".").slice(0, 2).join(".");
          setText(cleaned);
          onChange(cleaned === "" ? null : Number(cleaned));
        }}
        onBlur={() => {
          if (text === "" || text === ".") {
            setText("");
            onChange(null);
            return;
          }
          const parsed = Number(text);
          if (Number.isFinite(parsed)) setText(String(parsed));
        }}
        className={cn(
          "h-12 w-full rounded-lg border bg-background pl-9 pr-3.5 text-lg font-medium tabular shadow-sm transition-[color,box-shadow,border-color]",
          "placeholder:font-normal placeholder:text-muted-foreground/60",
          "focus-visible:border-ring focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-ring/40",
          invalid && "border-destructive",
        )}
        style={{ paddingLeft: `calc(1rem + ${symbol.length * 0.55}rem)` }}
      />
    </div>
  );
}
