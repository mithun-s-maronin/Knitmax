import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ArrowLeft } from "lucide-react";

import { Button } from "@/components/ui/button";
import { PageShell } from "@/components/dashboard/page-header";
import { PrintButton } from "@/components/reports/print-button";
import { LogoMark } from "@/components/brand/logo";
import { requireSessionContext } from "@/lib/auth";
import { getAssessment } from "@/lib/data/assessments";
import { getDashboardView } from "@/lib/data/dashboard";
import { getScoreSummary, readStoredResult } from "@/lib/scoring";
import { formatCurrency, formatDate, formatMonths, formatPercent } from "@/lib/format";

export const metadata: Metadata = { title: "Financial health report" };

export default async function ReportPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { user, profile } = await requireSessionContext(`/dashboard/reports/${id}`);

  const record = await getAssessment(user.id, id);
  if (!record) notFound();

  const result = readStoredResult(record.assessment);
  const view = await getDashboardView(user.id);
  const { snapshot } = view;
  const currency = result.currency;
  const m = result.metrics;

  const strengths = result.pillars.flatMap((p) =>
    p.strengths.map((text) => ({ pillar: p.label, text })),
  );
  const weaknesses = result.pillars.flatMap((p) =>
    p.weaknesses.map((text) => ({ pillar: p.label, text })),
  );
  const actions = snapshot.actionPlans.filter((a) => a.status === "pending");

  return (
    <PageShell width="narrow">
      <div className="no-print mb-6 flex flex-wrap items-center justify-between gap-3">
        <Button asChild variant="ghost" size="sm" className="-ml-2">
          <Link href="/dashboard/reports">
            <ArrowLeft className="size-4" />
            All reports
          </Link>
        </Button>
        <PrintButton />
      </div>

      <article className="surface p-6 print:border-0 print:p-0 sm:p-10">
        {/* ---- Masthead ---- */}
        <header className="flex items-start justify-between gap-4 border-b pb-6">
          <div>
            <p className="flex items-center gap-2 text-primary">
              <LogoMark className="size-5" />
              <span className="text-sm font-semibold tracking-[-0.01em] text-foreground">
                Meridian
              </span>
            </p>
            <h1 className="mt-4 text-2xl font-semibold tracking-[-0.02em]">
              Financial Health Report
            </h1>
            <p className="mt-1.5 text-sm text-muted-foreground">
              {profile?.full_name ? `Prepared for ${profile.full_name} · ` : ""}
              Assessment of {formatDate(result.completedAt, "long")}
            </p>
          </div>
          <div className="text-right">
            <p className="text-5xl font-semibold tabular leading-none">
              {result.overallScore}
            </p>
            <p className="mt-1 text-sm font-medium">{result.overallStatus.label}</p>
            <p className="text-xs text-muted-foreground">out of 100</p>
          </div>
        </header>

        <p className="mt-6 text-pretty">{getScoreSummary(result.overallScore)}</p>

        {/* ---- Pillars ---- */}
        <section className="mt-8">
          <h2 className="text-lg font-semibold tracking-[-0.015em]">Pillar scores</h2>
          <table className="mt-3 w-full text-sm">
            <thead>
              <tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="py-2">Pillar</th>
                <th className="py-2 text-right">Score</th>
                <th className="py-2 text-right">Weight</th>
                <th className="py-2 text-right">Contribution</th>
              </tr>
            </thead>
            <tbody>
              {result.pillars.map((pillar) => (
                <tr key={pillar.key} className="border-b last:border-0">
                  <td className="py-2.5 font-medium">{pillar.label}</td>
                  <td className="py-2.5 text-right tabular">
                    {pillar.score ?? "Not measured"}
                  </td>
                  <td className="py-2.5 text-right tabular text-muted-foreground">
                    {Math.round(pillar.effectiveWeight * 100)}%
                  </td>
                  <td className="py-2.5 text-right tabular">
                    {pillar.score === null
                      ? "—"
                      : (pillar.score * pillar.effectiveWeight).toFixed(1)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        {/* ---- Summary ---- */}
        <section className="mt-8">
          <h2 className="text-lg font-semibold tracking-[-0.015em]">Financial summary</h2>
          <dl className="mt-3 grid grid-cols-2 gap-x-8 gap-y-3 text-sm sm:grid-cols-3">
            {[
              ["Monthly income", formatCurrency(m.monthlyIncome, currency)],
              ["Monthly living costs", formatCurrency(m.monthlyExpenses, currency)],
              ["Essential costs", formatCurrency(m.essentialMonthlyExpenses, currency)],
              ["Debt repayments", formatCurrency(m.monthlyDebtPayments, currency)],
              ["Left each month", formatCurrency(m.disposableIncome, currency)],
              ["Saved each month", formatCurrency(m.monthlySavings, currency)],
              ["Savings rate", formatPercent(m.savingsRate, 1)],
              ["Total savings", formatCurrency(m.totalSavings, currency)],
              ["Emergency fund", formatMonths(m.emergencyFundMonths)],
              ["Total debt", formatCurrency(m.totalDebt, currency)],
              ["Debt-to-income", formatPercent(m.debtToIncomeRatio, 1)],
              ["Net worth", formatCurrency(snapshot.netWorth.netWorth, currency)],
            ].map(([label, value]) => (
              <div key={label}>
                <dt className="text-xs text-muted-foreground">{label}</dt>
                <dd className="mt-0.5 font-medium tabular">{value}</dd>
              </div>
            ))}
          </dl>
        </section>

        {/* ---- Strengths and weaknesses ---- */}
        <section className="mt-8 grid gap-6 sm:grid-cols-2">
          <div>
            <h2 className="text-lg font-semibold tracking-[-0.015em]">Strengths</h2>
            {strengths.length > 0 ? (
              <ul className="mt-3 space-y-2 text-sm">
                {strengths.map((item, i) => (
                  <li key={i} className="text-pretty">
                    <span className="text-muted-foreground">{item.pillar}: </span>
                    {item.text}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 text-sm text-muted-foreground">
                Nothing is at full marks yet.
              </p>
            )}
          </div>

          <div>
            <h2 className="text-lg font-semibold tracking-[-0.015em]">Areas to improve</h2>
            {weaknesses.length > 0 ? (
              <ul className="mt-3 space-y-2 text-sm">
                {weaknesses.map((item, i) => (
                  <li key={i} className="text-pretty">
                    <span className="text-muted-foreground">{item.pillar}: </span>
                    {item.text}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 text-sm text-muted-foreground">
                Nothing is pulling the score down.
              </p>
            )}
          </div>
        </section>

        {/* ---- Recommendations ---- */}
        {result.recommendations.length > 0 ? (
          <section className="mt-8 print-break-before">
            <h2 className="text-lg font-semibold tracking-[-0.015em]">Recommendations</h2>
            <ol className="mt-3 space-y-4">
              {result.recommendations.map((recommendation, i) => (
                <li key={recommendation.key} className="text-sm">
                  <p className="font-medium text-pretty">
                    {i + 1}. {recommendation.title}
                    {recommendation.estimatedImpact !== null ? (
                      <span className="ml-2 font-normal text-muted-foreground">
                        (+{recommendation.estimatedImpact} points, measured)
                      </span>
                    ) : null}
                  </p>
                  <p className="mt-1 text-muted-foreground text-pretty">
                    {recommendation.description}
                  </p>
                </li>
              ))}
            </ol>
          </section>
        ) : null}

        {/* ---- Action plan ---- */}
        {actions.length > 0 ? (
          <section className="mt-8">
            <h2 className="text-lg font-semibold tracking-[-0.015em]">
              Outstanding actions
            </h2>
            <ul className="mt-3 space-y-2 text-sm">
              {actions.map((action) => (
                <li key={action.id} className="flex gap-2.5 text-pretty">
                  <span aria-hidden className="mt-1.5 size-1.5 shrink-0 rounded-full bg-foreground/40" />
                  <span>
                    <span className="font-medium">{action.title}</span>
                    <span className="text-muted-foreground">
                      {" "}
                      —{" "}
                      {action.horizon === "immediate"
                        ? "next 7 days"
                        : action.horizon === "short_term"
                          ? "next 1–3 months"
                          : "next 6–12 months"}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {/* ---- Score history ---- */}
        {snapshot.scoreHistory.length > 1 ? (
          <section className="mt-8">
            <h2 className="text-lg font-semibold tracking-[-0.015em]">Score history</h2>
            <table className="mt-3 w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="py-2">Date</th>
                  <th className="py-2 text-right">Overall</th>
                  <th className="py-2 text-right">Spend</th>
                  <th className="py-2 text-right">Save</th>
                  <th className="py-2 text-right">Borrow</th>
                  <th className="py-2 text-right">Plan</th>
                </tr>
              </thead>
              <tbody>
                {snapshot.scoreHistory.map((row) => (
                  <tr key={row.id} className="border-b last:border-0">
                    <td className="py-2">{formatDate(row.recorded_at)}</td>
                    <td className="py-2 text-right tabular font-medium">
                      {row.overall_score}
                    </td>
                    <td className="py-2 text-right tabular">{row.spend_score ?? "—"}</td>
                    <td className="py-2 text-right tabular">{row.save_score ?? "—"}</td>
                    <td className="py-2 text-right tabular">{row.borrow_score ?? "—"}</td>
                    <td className="py-2 text-right tabular">{row.plan_score ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        ) : null}

        <footer className="mt-10 border-t pt-5 text-xs text-muted-foreground text-pretty">
          <p>
            Generated by Meridian on {formatDate(new Date(), "long")} from the
            assessment completed {formatDate(result.completedAt, "long")}, under
            scoring version {result.scoringVersion}. Every figure comes from the
            deterministic scoring engine and the user&apos;s own records.
          </p>
          <p className="mt-2">
            This is general information about your own figures, not financial
            advice, and it does not account for your full circumstances.
          </p>
        </footer>
      </article>
    </PageShell>
  );
}
