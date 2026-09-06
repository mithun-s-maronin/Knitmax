"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "motion/react";
import { ArrowUpRight, CalendarCheck, CreditCard, PiggyBank, Receipt } from "lucide-react";

import { cn } from "@/lib/utils";
import { getScoreStatus, type PillarResult } from "@/lib/scoring";
import { Progress } from "@/components/ui/progress";
import { AnimatedNumber } from "./animated-number";

const PILLAR_ICONS = {
  spend: Receipt,
  save: PiggyBank,
  borrow: CreditCard,
  plan: CalendarCheck,
} as const;

const PILLAR_ACCENTS = {
  spend: "text-pillar-spend",
  save: "text-pillar-save",
  borrow: "text-pillar-borrow",
  plan: "text-pillar-plan",
} as const;

const PILLAR_BG = {
  spend: "bg-pillar-spend/12",
  save: "bg-pillar-save/12",
  borrow: "bg-pillar-borrow/12",
  plan: "bg-pillar-plan/12",
} as const;

/**
 * One pillar's score, with its status, progress and headline explanation.
 * The whole card is the link, so it is a single tab stop with a visible focus
 * ring rather than a card containing a small "view" link.
 */
export function PillarScoreCard({
  pillar,
  href,
  index = 0,
  className,
}: {
  pillar: PillarResult;
  href?: string;
  index?: number;
  className?: string;
}) {
  const reduceMotion = useReducedMotion();
  const Icon = PILLAR_ICONS[pillar.key];
  const status = pillar.score === null ? null : getScoreStatus(pillar.score);

  const headline =
    pillar.strengths[0] ??
    pillar.weaknesses[0] ??
    pillar.breakdown.find((c) => c.status === "ok")?.explanation ??
    "Add a little more information to score this pillar.";

  const body = (
    <>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className={cn("rounded-lg p-2", PILLAR_BG[pillar.key], PILLAR_ACCENTS[pillar.key])}>
            <Icon className="size-4.5" />
          </span>
          <div>
            <p className="font-semibold leading-tight">{pillar.label}</p>
            <p className="text-xs text-muted-foreground">
              {Math.round(pillar.weight * 100)}% of your score
            </p>
          </div>
        </div>
        {href ? (
          <ArrowUpRight className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
        ) : null}
      </div>

      <div className="mt-5 flex items-baseline gap-1.5">
        {pillar.score === null ? (
          <span className="text-2xl font-semibold text-muted-foreground">—</span>
        ) : (
          <>
            <span className="text-4xl font-semibold tabular leading-none tracking-tight">
              <AnimatedNumber value={pillar.score} />
              <span className="sr-only">{pillar.score}</span>
            </span>
            <span className="text-sm text-muted-foreground">/ 100</span>
          </>
        )}
        {status ? (
          <span className={cn("ml-auto text-sm font-medium", status.textClass)}>
            {status.label}
          </span>
        ) : (
          <span className="ml-auto text-sm text-muted-foreground">Not scored</span>
        )}
      </div>

      <Progress
        value={pillar.score ?? 0}
        className="mt-3 h-1.5"
        indicatorClassName={cn(
          pillar.key === "spend" && "bg-pillar-spend",
          pillar.key === "save" && "bg-pillar-save",
          pillar.key === "borrow" && "bg-pillar-borrow",
          pillar.key === "plan" && "bg-pillar-plan",
        )}
        aria-label={`${pillar.label} score`}
      />

      <p className="mt-4 line-clamp-3 text-sm text-muted-foreground text-pretty">
        {headline}
      </p>
    </>
  );

  const shell = cn(
    "surface group block p-5 text-left transition-shadow",
    href && "hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
    className,
  );

  return (
    <motion.div
      initial={reduceMotion ? false : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.07, ease: [0.16, 1, 0.3, 1] }}
    >
      {href ? (
        <Link href={href} className={shell}>
          {body}
        </Link>
      ) : (
        <div className={shell}>{body}</div>
      )}
    </motion.div>
  );
}
