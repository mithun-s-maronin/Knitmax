import Link from "next/link";
import type { Metadata } from "next";
import {
  ArrowRight,
  BadgeCheck,
  Bot,
  CalendarCheck,
  ChartLine,
  CreditCard,
  Lock,
  PiggyBank,
  Receipt,
  Scale,
  SlidersHorizontal,
  Sparkles,
  Target,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Reveal } from "@/components/marketing/reveal";
import { ScoreGauge } from "@/components/score/score-gauge";
import {
  PILLAR_WEIGHTS,
  SCORE_RANGES,
  SCORE_STATUS_LABELS,
  scoreFinancialHealth,
} from "@/lib/scoring";

export const metadata: Metadata = {
  title: "Understand your financial health in minutes",
  description:
    "Answer a short set of questions and get a Financial Health Score across four pillars — Spend, Save, Borrow and Plan — with the exact calculation shown, personalised insights and a plan you can follow.",
};

/**
 * The example score on this page is produced by the real engine from a real
 * profile, so the marketing page can never drift away from what the product
 * actually calculates.
 */
const EXAMPLE = scoreFinancialHealth({
  currency: "USD",
  monthlyIncome: 5200,
  monthlyExpenses: 3100,
  essentialMonthlyExpenses: 2300,
  monthlyDebtPayments: 520,
  monthlySavings: 520,
  emergencyFundAmount: 6900,
  totalSavings: 11400,
  totalDebt: 16800,
  highInterestDebt: 3200,
  billPayment: "always",
  savingsConsistency: "most_months",
  goals: "clear",
  insuranceApplicable: ["health", "vehicle"],
  insuranceCovered: ["health", "vehicle"],
  longTermPlanning: "basic_plan",
  reviewHabit: "monthly",
});

const PILLARS = [
  {
    key: "spend" as const,
    icon: Receipt,
    title: "Spend",
    weight: PILLAR_WEIGHTS.spend,
    body: "How sustainably you handle everyday money: what share of your income goes out, what is left after the bills, and whether those bills get paid on time.",
    accent: "text-pillar-spend",
    bg: "bg-pillar-spend/12",
  },
  {
    key: "save" as const,
    icon: PiggyBank,
    title: "Save",
    weight: PILLAR_WEIGHTS.save,
    body: "Your resilience: how many months of essential costs your emergency fund covers, how much of your income you save, and whether you save reliably.",
    accent: "text-pillar-save",
    bg: "bg-pillar-save/12",
  },
  {
    key: "borrow" as const,
    icon: CreditCard,
    title: "Borrow",
    weight: PILLAR_WEIGHTS.borrow,
    body: "Whether your debt is sustainable: its size against a year of income, what repayments take each month, and how much of it is expensive. No debt scores 100.",
    accent: "text-pillar-borrow",
    bg: "bg-pillar-borrow/12",
  },
  {
    key: "plan" as const,
    icon: CalendarCheck,
    title: "Plan",
    weight: PILLAR_WEIGHTS.plan,
    body: "How ready you are for what is coming: goals with real numbers, the cover that applies to you, a long-term plan, and the habit of actually looking.",
    accent: "text-pillar-plan",
    bg: "bg-pillar-plan/12",
  },
];

const FEATURES = [
  {
    icon: Sparkles,
    title: "Insights that name the actual problem",
    body: "Not \"consider saving more\" — the specific number that is holding your score down, why it matters, and what moving it would be worth.",
  },
  {
    icon: Target,
    title: "A plan split by horizon",
    body: "What to do in the next seven days, the next three months, and the next year. Tick things off and the plan remembers.",
  },
  {
    icon: SlidersHorizontal,
    title: "A simulator that uses the real engine",
    body: "Change your income, savings, spending or an extra debt payment and see the projected score. Nothing is saved unless you choose to apply it.",
  },
  {
    icon: ChartLine,
    title: "History that stays honest",
    body: "Every completed assessment is kept exactly as it was, with the formula version that produced it. Old scores never shift under a new calculation.",
  },
  {
    icon: Scale,
    title: "Calculators for the hard questions",
    body: "Emergency fund target, savings goal timelines, and debt payoff compared across avalanche, snowball and extra payments.",
  },
  {
    icon: Lock,
    title: "Your data, under your control",
    body: "Row-level security means nobody else can read your records. Export everything as JSON or CSV, and delete any of it whenever you want.",
  },
];

const STEPS = [
  {
    number: "01",
    title: "Answer the questions",
    body: "Six short sections covering income, spending, saving, debt and planning. It saves as you go, so you can stop and come back.",
  },
  {
    number: "02",
    title: "Get your score",
    body: "One number out of 100, four pillar scores, and the full calculation — every metric, every weight, every component contribution.",
  },
  {
    number: "03",
    title: "Work the plan",
    body: "Prioritised actions with the score impact measured, not guessed. Track progress, check in monthly, and watch the trend.",
  },
];

const FAQ = [
  {
    q: "How is the score calculated?",
    a: "Four pillars, weighted: Spend 25%, Save 30%, Borrow 25% and Plan 20%. Each pillar is made of weighted components with published thresholds — expenses as a share of income, months of emergency cover, debt against annual income, and so on. Your results page shows every measured value and what each contributed, so the four pillar scores add back up to your overall score exactly.",
  },
  {
    q: "Does having no debt hurt my score?",
    a: "No. If you carry no debt, all three Borrow components score full marks and the pillar scores 100. Nothing in the model rewards borrowing.",
  },
  {
    q: "What if a question does not apply to me?",
    a: "It is excluded rather than scored zero, and the remaining weights are scaled up to fill the gap. Someone with no car is not marked down for having no vehicle insurance, and a profile with no income recorded reports insufficient data rather than a made-up ratio.",
  },
  {
    q: "Does the AI assistant decide my score?",
    a: "Never. Scores come only from the deterministic engine. The assistant reads the results and explains them, and when it needs a number for a what-if it calls the same engine rather than estimating. It also cannot see your finances at all unless you leave that permission switched on.",
  },
  {
    q: "What happens to old assessments?",
    a: "They are kept, unchanged, forever. The database physically refuses to update them. If the formulas are ever revised, past scores keep the version they were calculated with, and only new assessments use the new one.",
  },
  {
    q: "Is this financial advice?",
    a: "No. Meridian gives you a structured read on your own numbers and general guidance about them. It does not know your full circumstances, and it is not a substitute for a professional who does.",
  },
];

export default function LandingPage() {
  return (
    <>
      {/* ---------------------------------------------------------------- Hero */}
      <section className="relative overflow-hidden">
        <div className="aurora pointer-events-none absolute inset-0 -z-10" aria-hidden />
        <div className="mx-auto grid w-full max-w-6xl gap-14 px-5 pb-20 pt-16 sm:px-8 sm:pb-28 sm:pt-24 lg:grid-cols-[1.15fr_1fr] lg:items-center">
          <Reveal>
            <Badge variant="outline" className="mb-6 border-primary/30 bg-background/70 py-1">
              <BadgeCheck className="size-3.5 text-primary" />
              Four pillars. One score. No black box.
            </Badge>

            <h1 className="max-w-[15ch] text-balance text-5xl font-semibold leading-[0.98] tracking-[-0.035em] sm:text-6xl lg:text-7xl">
              Understand your financial health in minutes.
            </h1>

            <p className="mt-6 max-w-xl text-lg text-muted-foreground text-pretty">
              Meridian turns what you earn, spend, save, owe and plan into a
              single score out of 100 — then shows you the exact calculation,
              what is holding it back, and what to do about it first.
            </p>

            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Button asChild size="xl">
                <Link href="/signup">
                  Check my financial health
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
              <Button asChild size="xl" variant="outline">
                <a href="#how">Learn how it works</a>
              </Button>
            </div>

            <p className="mt-5 text-sm text-muted-foreground">
              Six short sections, about five minutes.{" "}
              <Link href="/demo" className="font-medium text-foreground underline underline-offset-4">
                Or try the demo first
              </Link>{" "}
              — no account needed.
            </p>
          </Reveal>

          <Reveal delay={0.12}>
            <div className="surface-raised mx-auto w-full max-w-sm p-7">
              <p className="text-center text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
                Your financial health score
              </p>
              <div className="mt-5 flex justify-center">
                <ScoreGauge score={EXAMPLE.overallScore} size="md" />
              </div>

              <dl className="mt-7 grid grid-cols-2 gap-x-4 gap-y-3.5 border-t pt-6">
                {EXAMPLE.pillars.map((pillar) => (
                  <div key={pillar.key} className="flex items-baseline justify-between gap-2">
                    <dt className="text-sm text-muted-foreground">{pillar.label}</dt>
                    <dd className="text-sm font-semibold tabular">{pillar.score ?? "—"}</dd>
                  </div>
                ))}
              </dl>

              <p className="mt-6 text-xs text-muted-foreground text-pretty">
                An illustrative profile, scored by the same engine the product
                uses. Your own numbers will look different.
              </p>
            </div>
          </Reveal>
        </div>
      </section>

      {/* --------------------------------------------------------------- Score */}
      <section id="score" className="scroll-mt-20 border-t bg-muted/25">
        <div className="mx-auto w-full max-w-6xl px-5 py-20 sm:px-8 sm:py-24">
          <Reveal>
            <h2 className="max-w-[20ch] text-balance text-3xl font-semibold tracking-[-0.025em] sm:text-4xl">
              One number, and the whole working shown underneath.
            </h2>
            <p className="mt-5 max-w-2xl text-lg text-muted-foreground text-pretty">
              A score is only useful if you can see where it came from. Meridian
              shows you every measured value, the weight it carries and the
              points it contributed — so you can check the arithmetic yourself.
            </p>
          </Reveal>

          <Reveal delay={0.1} className="mt-12">
            <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-5">
              {(
                [
                  ["excellent", SCORE_RANGES.excellent],
                  ["good", SCORE_RANGES.good],
                  ["fair", SCORE_RANGES.fair],
                  ["needsImprovement", SCORE_RANGES.needsImprovement],
                  ["critical", SCORE_RANGES.critical],
                ] as const
              ).map(([key, range]) => (
                <div key={key} className="surface p-5">
                  <div
                    className="h-1.5 w-10 rounded-full"
                    style={{
                      background: `var(--score-${key === "needsImprovement" ? "needs-improvement" : key})`,
                    }}
                  />
                  <p className="mt-4 text-2xl font-semibold tabular tracking-tight">
                    {range.min}–{range.max}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {SCORE_STATUS_LABELS[key]}
                  </p>
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      {/* ------------------------------------------------------------- Pillars */}
      <section id="pillars" className="scroll-mt-20 border-t">
        <div className="mx-auto w-full max-w-6xl px-5 py-20 sm:px-8 sm:py-24">
          <Reveal>
            <h2 className="max-w-[22ch] text-balance text-3xl font-semibold tracking-[-0.025em] sm:text-4xl">
              Four pillars, because one number is never the whole story.
            </h2>
            <p className="mt-5 max-w-2xl text-lg text-muted-foreground text-pretty">
              Two people can share a score of 62 for completely different
              reasons. The pillars tell you which one you are.
            </p>
          </Reveal>

          <ul className="mt-12 grid gap-5 sm:grid-cols-2">
            {PILLARS.map((pillar, i) => (
              <Reveal as="li" key={pillar.key} delay={i * 0.07} className="surface p-7">
                <div className="flex items-center gap-3">
                  <span className={`rounded-xl p-2.5 ${pillar.bg} ${pillar.accent}`}>
                    <pillar.icon className="size-5" />
                  </span>
                  <div>
                    <h3 className="text-lg font-semibold">{pillar.title}</h3>
                    <p className="text-xs text-muted-foreground">
                      {Math.round(pillar.weight * 100)}% of your overall score
                    </p>
                  </div>
                </div>
                <p className="mt-5 text-muted-foreground text-pretty">{pillar.body}</p>
              </Reveal>
            ))}
          </ul>
        </div>
      </section>

      {/* ----------------------------------------------------------- How it works */}
      <section id="how" className="scroll-mt-20 border-t bg-muted/25">
        <div className="mx-auto w-full max-w-6xl px-5 py-20 sm:px-8 sm:py-24">
          <Reveal>
            <h2 className="text-balance text-3xl font-semibold tracking-[-0.025em] sm:text-4xl">
              How it works
            </h2>
          </Reveal>

          <ol className="mt-12 grid gap-6 lg:grid-cols-3">
            {STEPS.map((step, i) => (
              <Reveal as="li" key={step.number} delay={i * 0.08} className="surface p-7">
                <span className="text-sm font-semibold tabular text-primary">
                  {step.number}
                </span>
                <h3 className="mt-3 text-lg font-semibold">{step.title}</h3>
                <p className="mt-2.5 text-muted-foreground text-pretty">{step.body}</p>
              </Reveal>
            ))}
          </ol>

          <Reveal delay={0.16} className="mt-10">
            <Button asChild size="lg">
              <Link href="/signup">
                Start my assessment
                <ArrowRight className="size-4" />
              </Link>
            </Button>
          </Reveal>
        </div>
      </section>

      {/* ----------------------------------------------------------- Assistant */}
      <section id="assistant" className="scroll-mt-20 border-t">
        <div className="mx-auto grid w-full max-w-6xl gap-12 px-5 py-20 sm:px-8 sm:py-24 lg:grid-cols-2 lg:items-center">
          <Reveal>
            <Badge variant="muted" className="mb-5">
              <Bot className="size-3.5" />
              AI assistant
            </Badge>
            <h2 className="max-w-[18ch] text-balance text-3xl font-semibold tracking-[-0.025em] sm:text-4xl">
              An assistant that explains, and never invents.
            </h2>
            <p className="mt-5 text-lg text-muted-foreground text-pretty">
              Ask why your Save score is 48, what to pay off first, or what your
              dashboard is telling you. The assistant reads your actual figures
              — with your permission — and when a question needs a number it
              calls the scoring engine rather than guessing.
            </p>
            <ul className="mt-7 space-y-3">
              {[
                "It cannot see your finances unless you allow it, and you can switch that off at any time.",
                "It never produces an official score, score change or projected impact of its own.",
                "Your conversations are saved to your account, and you can delete any of them.",
              ].map((item) => (
                <li key={item} className="flex gap-3 text-muted-foreground text-pretty">
                  <BadgeCheck className="mt-0.5 size-4.5 shrink-0 text-primary" />
                  {item}
                </li>
              ))}
            </ul>
          </Reveal>

          <Reveal delay={0.12}>
            <div className="surface-raised overflow-hidden">
              <div className="flex items-center gap-2 border-b bg-muted/40 px-5 py-3">
                <Bot className="size-4 text-primary" />
                <span className="text-sm font-medium">Meridian assistant</span>
              </div>
              <div className="space-y-4 p-5 text-sm">
                <p className="ml-auto w-fit max-w-[85%] rounded-2xl rounded-br-sm bg-primary px-4 py-2.5 text-primary-foreground">
                  Why is my Save score only 48?
                </p>
                <div className="max-w-[92%] rounded-2xl rounded-bl-sm bg-muted px-4 py-3 text-foreground/90">
                  <p className="text-pretty">
                    Two of the three components are pulling it down. Your
                    emergency fund covers 3.0 months of essential costs, which
                    scores 50 out of 100 against the six-month target, and it
                    carries the heaviest weight in this pillar at 45%. Your
                    savings rate of 10% scores 50 as well.
                  </p>
                  <p className="mt-3 text-pretty">
                    Saving consistently every month is already at full marks.
                    Getting the fund to six months would be worth the most.
                  </p>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ------------------------------------------------------------ Features */}
      <section className="border-t bg-muted/25">
        <div className="mx-auto w-full max-w-6xl px-5 py-20 sm:px-8 sm:py-24">
          <Reveal>
            <h2 className="text-balance text-3xl font-semibold tracking-[-0.025em] sm:text-4xl">
              Everything after the score
            </h2>
            <p className="mt-5 max-w-2xl text-lg text-muted-foreground text-pretty">
              A number on its own changes nothing. The rest of Meridian is about
              what you do next, and whether it worked.
            </p>
          </Reveal>

          <ul className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((feature, i) => (
              <Reveal as="li" key={feature.title} delay={(i % 3) * 0.06} className="surface p-6">
                <feature.icon className="size-5 text-primary" />
                <h3 className="mt-4 font-semibold">{feature.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground text-pretty">
                  {feature.body}
                </p>
              </Reveal>
            ))}
          </ul>
        </div>
      </section>

      {/* -------------------------------------------------------- Transparency */}
      <section id="transparency" className="scroll-mt-20 border-t">
        <div className="mx-auto w-full max-w-3xl px-5 py-20 sm:px-8 sm:py-24">
          <Reveal>
            <h2 className="text-balance text-3xl font-semibold tracking-[-0.025em] sm:text-4xl">
              The formula, in the open
            </h2>
            <p className="mt-5 text-lg text-muted-foreground text-pretty">
              This is the whole of it. Every pillar breaks down the same way,
              into weighted components with published thresholds.
            </p>
            <div className="surface mt-8 overflow-x-auto p-6">
              <pre className="text-sm leading-relaxed tabular">
                <code>{`Overall = (Spend × 0.25)
        + (Save  × 0.30)
        + (Borrow × 0.25)
        + (Plan  × 0.20)`}</code>
              </pre>
            </div>
            <p className="mt-6 text-muted-foreground text-pretty">
              Your results page lists each component&apos;s measured value, its
              weight and the points it contributed. If a component cannot be
              measured from what you gave us, it is left out and the remaining
              weights are scaled up — never scored as a zero.
            </p>
          </Reveal>
        </div>
      </section>

      {/* ----------------------------------------------------------------- FAQ */}
      <section id="faq" className="scroll-mt-20 border-t bg-muted/25">
        <div className="mx-auto w-full max-w-3xl px-5 py-20 sm:px-8 sm:py-24">
          <Reveal>
            <h2 className="text-balance text-3xl font-semibold tracking-[-0.025em] sm:text-4xl">
              Questions worth asking
            </h2>
          </Reveal>
          <Reveal delay={0.08} className="mt-10">
            <Accordion type="single" collapsible className="surface px-6">
              {FAQ.map((item) => (
                <AccordionItem key={item.q} value={item.q}>
                  <AccordionTrigger>{item.q}</AccordionTrigger>
                  <AccordionContent>{item.a}</AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </Reveal>
        </div>
      </section>

      {/* ------------------------------------------------------------ Final CTA */}
      <section className="relative overflow-hidden border-t">
        <div className="aurora pointer-events-none absolute inset-0 -z-10 opacity-70" aria-hidden />
        <div className="mx-auto w-full max-w-3xl px-5 py-24 text-center sm:px-8">
          <Reveal>
            <h2 className="text-balance text-4xl font-semibold tracking-[-0.03em] sm:text-5xl">
              Find out where you stand.
            </h2>
            <p className="mx-auto mt-5 max-w-lg text-lg text-muted-foreground text-pretty">
              Five minutes to a score you can actually act on, and a plan that
              starts with the one thing that matters most.
            </p>
            <div className="mt-9 flex flex-col justify-center gap-3 sm:flex-row">
              <Button asChild size="xl">
                <Link href="/signup">
                  Check my financial health
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
              <Button asChild size="xl" variant="outline">
                <Link href="/demo">Try the demo</Link>
              </Button>
            </div>
          </Reveal>
        </div>
      </section>
    </>
  );
}
