import { NextResponse, type NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";

import { AI_MODEL, ANTHROPIC_API_KEY, isAiConfigured } from "@/lib/ai/config";
import { buildSystemPrompt } from "@/lib/ai/system-prompt";
import { answersToScoringInput } from "@/lib/assessment/toScoringInput";
import { answersSchema, validateAllSections } from "@/lib/assessment/schema";
import { scoreFinancialHealth } from "@/lib/scoring";
import { formatCurrency, formatMonths, formatPercent } from "@/lib/format";
import type { AnswerMap } from "@/lib/assessment/questions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 45;

/** Off entirely when set to "false". On by default wherever a key is present. */
const DEMO_AI_ENABLED = process.env.DEMO_AI_ENABLED !== "false";

/** Deliberately small. This endpoint has no account behind it. */
const MESSAGES_PER_HOUR = Number(process.env.DEMO_AI_MESSAGES_PER_HOUR ?? 8);
const WINDOW_MS = 3_600_000;
const MAX_TOKENS = 1200;

const requestSchema = z.object({
  message: z.string().trim().min(1).max(600),
  answers: answersSchema,
  history: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().max(4000),
      }),
    )
    .max(8)
    .default([]),
});

const calls = new Map<string, number[]>();

function clientKey(request: NextRequest): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown"
  );
}

function overLimit(key: string): boolean {
  const now = Date.now();
  const recent = (calls.get(key) ?? []).filter((t) => now - t < WINDOW_MS);
  recent.push(now);
  calls.set(key, recent);
  return recent.length > MESSAGES_PER_HOUR;
}

/**
 * The demo assistant (§63).
 *
 * Unauthenticated on purpose — the demo has no account — so it is fenced in
 * hard. It never touches the database. It accepts assessment answers rather
 * than free-form context, runs them through the same validation and the same
 * scoring engine, and builds the context from the engine's output, so a caller
 * cannot inject arbitrary text into the model's context. Rate limits are per
 * IP and small, and the reply length is capped.
 */
export async function POST(request: NextRequest) {
  if (!DEMO_AI_ENABLED || !isAiConfigured()) {
    return NextResponse.json(
      {
        error:
          "The demo assistant is not available on this deployment. Create an account and the full assistant is there.",
        code: "unavailable",
      },
      { status: 503 },
    );
  }

  if (overLimit(clientKey(request))) {
    return NextResponse.json(
      {
        error: `The demo assistant is limited to ${MESSAGES_PER_HOUR} questions an hour. Create an account for the full one.`,
      },
      { status: 429 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Malformed request." }, { status: 400 });
  }

  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "That message could not be sent." }, { status: 400 });
  }

  const answers = parsed.data.answers as AnswerMap;

  // Answers that would not pass the assessment do not get scored here either.
  if (Object.keys(validateAllSections(answers)).length > 0) {
    return NextResponse.json(
      { error: "The demo answers are incomplete. Run the demo assessment first." },
      { status: 400 },
    );
  }

  const input = answersToScoringInput(answers);
  const result = scoreFinancialHealth(input);
  const currency = input.currency;
  const money = (value: number) => formatCurrency(value, currency);
  const m = result.metrics;

  // Built from the engine's own output, never from anything the client wrote.
  const context = [
    "<financial_context>",
    "These are the figures for a DEMO profile — an example person, not a real user. Every number below came from the deterministic scoring engine. Quote them; do not recompute or invent any.",
    "",
    `Overall: ${result.overallScore}/100 (${result.overallStatus.label})`,
    ...result.pillars.map(
      (p) =>
        `${p.label}: ${p.score ?? "not measured"}/100 (weight ${Math.round(p.weight * 100)}%)` +
        p.breakdown
          .map(
            (c) =>
              `\n  - ${c.label}: ${c.status === "ok" ? `${Math.round(c.score ?? 0)}/100` : "insufficient data"}, measured ${c.metric.display}`,
          )
          .join(""),
    ),
    "",
    `Monthly income: ${money(m.monthlyIncome)}`,
    `Monthly living costs: ${money(m.monthlyExpenses)} (essential ${money(m.essentialMonthlyExpenses)})`,
    `Monthly debt repayments: ${money(m.monthlyDebtPayments)}`,
    `Left over each month: ${money(m.disposableIncome)}`,
    `Savings rate: ${formatPercent(m.savingsRate, 1)}`,
    `Emergency fund: ${money(m.emergencyFundAmount)} = ${formatMonths(m.emergencyFundMonths)} of essential costs`,
    `Total debt: ${money(m.totalDebt)} (high-interest ${money(m.highInterestDebt)})`,
    `Debt-to-income: ${formatPercent(m.debtToIncomeRatio, 1)}`,
    "",
    "Top recommendations from the engine, with measured point impacts:",
    ...result.recommendations
      .slice(0, 5)
      .map(
        (r) =>
          `- ${r.title}${r.estimatedImpact !== null ? ` (+${r.estimatedImpact} points)` : ""}: ${r.description}`,
      ),
    "</financial_context>",
  ].join("\n");

  const client = new Anthropic({ apiKey: ANTHROPIC_API_KEY });

  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: Record<string, unknown>) =>
        controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));

      try {
        send({ type: "start" });

        const messageStream = client.messages.stream({
          model: AI_MODEL,
          max_tokens: MAX_TOKENS,
          system: [
            buildSystemPrompt({ hasFinancialContext: true, currency }),
            "You are answering inside a public demo for an example profile. Keep answers to a few short paragraphs. You have no simulation tool here: if asked for the exact effect of a change, say what direction it moves and that the full product measures it precisely.",
            context,
          ].join("\n\n"),
          messages: [
            ...parsed.data.history.map((entry) => ({
              role: entry.role,
              content: entry.content,
            })),
            { role: "user" as const, content: parsed.data.message },
          ],
        });

        for await (const event of messageStream) {
          if (request.signal.aborted) break;
          if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
            send({ type: "text", value: event.delta.text });
          }
        }

        send({ type: "done" });
      } catch (error) {
        console.error("Demo AI error", error);
        send({
          type: "error",
          message:
            "The demo assistant could not answer just now. Create an account for the full one.",
        });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-store, no-transform",
      "X-Accel-Buffering": "no",
    },
  });
}
