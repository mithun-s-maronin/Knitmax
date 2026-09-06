"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  ArrowLeft,
  ArrowRight,
  CalendarCheck,
  CreditCard,
  Gauge,
  PiggyBank,
  Receipt,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { ScoreGauge } from "@/components/score/score-gauge";
import { PILLAR_WEIGHTS, SCORE_RANGES, SCORE_STATUS_LABELS } from "@/lib/scoring";
import { completeOnboarding } from "@/lib/actions/settings";

const PILLARS = [
  {
    icon: Receipt,
    title: "Spend",
    weight: PILLAR_WEIGHTS.spend,
    body: "What share of your income goes out, what is left, and whether the bills get paid on time.",
    tone: "text-pillar-spend bg-pillar-spend/12",
  },
  {
    icon: PiggyBank,
    title: "Save",
    weight: PILLAR_WEIGHTS.save,
    body: "How many months your emergency fund covers, how much you save, and how reliably.",
    tone: "text-pillar-save bg-pillar-save/12",
  },
  {
    icon: CreditCard,
    title: "Borrow",
    weight: PILLAR_WEIGHTS.borrow,
    body: "Whether your debt is a manageable size, and how much of it is expensive. No debt scores 100.",
    tone: "text-pillar-borrow bg-pillar-borrow/12",
  },
  {
    icon: CalendarCheck,
    title: "Plan",
    weight: PILLAR_WEIGHTS.plan,
    body: "Goals with real numbers, the cover that applies to you, and the habit of looking.",
    tone: "text-pillar-plan bg-pillar-plan/12",
  },
];

/** Welcome → what the score is → the four pillars → start. Skippable throughout. */
export function OnboardingFlow({ firstName }: { firstName: string | null }) {
  const router = useRouter();
  const reduceMotion = useReducedMotion();
  const [step, setStep] = React.useState(0);
  const [leaving, startLeaving] = React.useTransition();

  const finish = (destination: string) => {
    startLeaving(async () => {
      await completeOnboarding();
      router.push(destination);
    });
  };

  const steps = [
    {
      id: "welcome",
      render: (
        <>
          <Sparkles className="size-7 text-primary" />
          <h1 className="mt-5 text-3xl font-semibold tracking-[-0.025em] text-balance sm:text-4xl">
            {firstName ? `Welcome, ${firstName}.` : "Welcome to Meridian."}
          </h1>
          <p className="mt-4 text-lg text-muted-foreground text-pretty">
            In about five minutes you will have a clear read on where your money
            stands, why it stands there, and what to change first. Nothing you
            enter is shared, and you can delete all of it at any time.
          </p>
        </>
      ),
    },
    {
      id: "score",
      render: (
        <>
          <Gauge className="size-7 text-primary" />
          <h1 className="mt-5 text-3xl font-semibold tracking-[-0.025em] text-balance sm:text-4xl">
            What is a Financial Health Score?
          </h1>
          <p className="mt-4 text-lg text-muted-foreground text-pretty">
            One number out of 100 that summarises how your money is holding up.
            It is not a credit score and no lender ever sees it — it exists to
            tell you where you stand and what to do next.
          </p>

          <div className="mt-8 flex flex-col items-center gap-6 sm:flex-row sm:items-center">
            <ScoreGauge score={72} size="sm" showStatus={false} />
            <ul className="w-full space-y-2 text-sm">
              {(
                [
                  ["excellent", SCORE_RANGES.excellent],
                  ["good", SCORE_RANGES.good],
                  ["fair", SCORE_RANGES.fair],
                  ["needsImprovement", SCORE_RANGES.needsImprovement],
                  ["critical", SCORE_RANGES.critical],
                ] as const
              ).map(([key, range]) => (
                <li key={key} className="flex items-center gap-3">
                  <span
                    className="size-2.5 shrink-0 rounded-full"
                    style={{
                      background: `var(--score-${key === "needsImprovement" ? "needs-improvement" : key})`,
                    }}
                  />
                  <span className="tabular text-muted-foreground">
                    {range.min}–{range.max}
                  </span>
                  <span className="font-medium">{SCORE_STATUS_LABELS[key]}</span>
                </li>
              ))}
            </ul>
          </div>
        </>
      ),
    },
    {
      id: "pillars",
      render: (
        <>
          <ShieldCheck className="size-7 text-primary" />
          <h1 className="mt-5 text-3xl font-semibold tracking-[-0.025em] text-balance sm:text-4xl">
            Four pillars
          </h1>
          <p className="mt-4 text-lg text-muted-foreground text-pretty">
            Your score is built from four parts, each weighted. The pillars are
            what tell you which kind of 62 you are.
          </p>

          <ul className="mt-7 grid gap-3 sm:grid-cols-2">
            {PILLARS.map((pillar) => (
              <li key={pillar.title} className="rounded-xl border p-4 text-left">
                <div className="flex items-center gap-2.5">
                  <span className={`rounded-lg p-2 ${pillar.tone}`}>
                    <pillar.icon className="size-4" />
                  </span>
                  <span className="font-semibold">{pillar.title}</span>
                  <span className="ml-auto text-xs tabular text-muted-foreground">
                    {Math.round(pillar.weight * 100)}%
                  </span>
                </div>
                <p className="mt-2.5 text-sm text-muted-foreground text-pretty">
                  {pillar.body}
                </p>
              </li>
            ))}
          </ul>
        </>
      ),
    },
  ];

  const isLast = step === steps.length - 1;

  return (
    <div className="mx-auto w-full max-w-2xl px-5 py-12 sm:px-8 sm:py-16">
      <div className="mb-8 flex items-center gap-1.5" aria-hidden>
        {steps.map((s, i) => (
          <span
            key={s.id}
            className={`h-1 flex-1 rounded-full transition-colors ${
              i <= step ? "bg-primary" : "bg-border"
            }`}
          />
        ))}
      </div>

      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={steps[step].id}
          initial={reduceMotion ? false : { opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -14 }}
          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          className="surface p-7 sm:p-10"
        >
          {steps[step].render}
        </motion.div>
      </AnimatePresence>

      <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:items-center">
        <Button
          variant="outline"
          size="lg"
          onClick={() => setStep((s) => Math.max(s - 1, 0))}
          disabled={step === 0 || leaving}
        >
          <ArrowLeft className="size-4" />
          Back
        </Button>

        <div className="flex-1" />

        {isLast ? (
          <Button size="lg" loading={leaving} onClick={() => finish("/assessment")}>
            Start my assessment
            <ArrowRight className="size-4" />
          </Button>
        ) : (
          <Button size="lg" onClick={() => setStep((s) => s + 1)}>
            Continue
            <ArrowRight className="size-4" />
          </Button>
        )}
      </div>

      <div className="mt-6 text-center">
        <button
          type="button"
          onClick={() => finish("/assessment")}
          disabled={leaving}
          className="rounded text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:opacity-50"
        >
          Skip the introduction and start
        </button>
      </div>
    </div>
  );
}
