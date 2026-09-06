"use client";

import * as React from "react";
import { motion, useReducedMotion } from "motion/react";

import { cn } from "@/lib/utils";
import { getScoreStatus } from "@/lib/scoring";
import { AnimatedNumber } from "./animated-number";

const SIZES = {
  sm: { box: 132, stroke: 10, value: "text-3xl", label: "text-[0.6875rem]" },
  md: { box: 200, stroke: 14, value: "text-5xl", label: "text-xs" },
  lg: { box: 268, stroke: 18, value: "text-7xl", label: "text-sm" },
} as const;

/**
 * The financial health score, drawn as a 270-degree arc.
 *
 * The number is exposed to assistive technology through a live text label;
 * the arc itself is decorative, so a screen reader hears "72 out of 100,
 * Good" rather than a description of an SVG path.
 */
export function ScoreGauge({
  score,
  size = "md",
  label = "Financial Health Score",
  showStatus = true,
  insufficientData = false,
  className,
}: {
  score: number;
  size?: keyof typeof SIZES;
  label?: string;
  showStatus?: boolean;
  insufficientData?: boolean;
  className?: string;
}) {
  const reduceMotion = useReducedMotion();
  const { box, stroke, value, label: labelSize } = SIZES[size];
  const status = getScoreStatus(score);

  const radius = (box - stroke) / 2 - 2;
  const center = box / 2;
  // A 270-degree sweep starting at the lower left.
  const sweep = 0.75;
  const circumference = 2 * Math.PI * radius;
  const arcLength = circumference * sweep;
  const filled = arcLength * (Math.min(Math.max(score, 0), 100) / 100);

  return (
    <div className={cn("flex flex-col items-center", className)}>
      <div className="relative" style={{ width: box, height: box }}>
        <svg
          width={box}
          height={box}
          viewBox={`0 0 ${box} ${box}`}
          className="-rotate-[225deg]"
          aria-hidden
        >
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke="var(--muted)"
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={`${arcLength} ${circumference}`}
          />
          <motion.circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke={insufficientData ? "var(--muted-foreground)" : status.colorVar}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={`${filled} ${circumference}`}
            initial={reduceMotion ? false : { strokeDasharray: `0 ${circumference}` }}
            animate={{ strokeDasharray: `${filled} ${circumference}` }}
            transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
          />
        </svg>

        <div className="absolute inset-0 flex flex-col items-center justify-center">
          {insufficientData ? (
            <span className="px-6 text-center text-sm text-muted-foreground text-pretty">
              Not enough information yet
            </span>
          ) : (
            <>
              <div className={cn("font-semibold tabular leading-none tracking-tight", value)}>
                <AnimatedNumber value={score} />
                <span className="sr-only">{score}</span>
              </div>
              <div
                className={cn(
                  "mt-1.5 font-medium uppercase tracking-[0.14em] text-muted-foreground",
                  labelSize,
                )}
              >
                out of 100
              </div>
            </>
          )}
        </div>
      </div>

      {showStatus && !insufficientData ? (
        <p className={cn("mt-3 text-lg font-semibold", status.textClass)}>
          {status.label}
        </p>
      ) : null}

      <p className="sr-only" role="status">
        {insufficientData
          ? `${label}: not enough information yet.`
          : `${label}: ${score} out of 100, ${status.label}.`}
      </p>
    </div>
  );
}
