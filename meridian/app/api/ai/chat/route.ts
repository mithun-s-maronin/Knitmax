import { NextResponse, type NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { betaZodTool } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod";

import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import {
  AI_HISTORY_TURNS,
  AI_MAX_TOKENS,
  AI_MODEL,
  ANTHROPIC_API_KEY,
  isAiConfigured,
} from "@/lib/ai/config";
import { buildFinancialContext } from "@/lib/ai/context";
import { buildSystemPrompt } from "@/lib/ai/system-prompt";
import { describeSimulation, runSimulation, simulationInputSchema } from "@/lib/ai/tools";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const requestSchema = z.object({
  conversationId: z.uuid().nullish(),
  message: z.string().trim().min(1, "Say something first.").max(4000),
});

/** A conversation title derived from the opening question. */
function titleFrom(message: string): string {
  const cleaned = message.replace(/\s+/g, " ").trim();
  if (cleaned.length <= 60) return cleaned;
  return `${cleaned.slice(0, 57).trimEnd()}…`;
}

/**
 * A crude per-user rate limit.
 *
 * In-process, so it resets on deploy and does not span instances — it is a
 * brake on an obvious loop, not a security control. A durable limiter belongs
 * in front of this route in production; the README says so.
 */
const recentCalls = new Map<string, number[]>();
const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 20;

function overRateLimit(userId: string): boolean {
  const now = Date.now();
  const calls = (recentCalls.get(userId) ?? []).filter((t) => now - t < WINDOW_MS);
  calls.push(now);
  recentCalls.set(userId, calls);
  return calls.length > MAX_PER_WINDOW;
}

/**
 * The assistant endpoint.
 *
 *   Browser -> this authenticated route -> server-side context builder -> Anthropic
 *
 * The client sends a message and, optionally, which conversation it belongs
 * to. It cannot supply financial context, a system prompt, a model, or a
 * conversation it does not own — all of that is decided here (§69).
 */
export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "You need to be signed in." }, { status: 401 });
  }

  if (!isAiConfigured()) {
    return NextResponse.json(
      {
        error:
          "The assistant is not configured on this deployment. Add ANTHROPIC_API_KEY to the server environment.",
        code: "not_configured",
      },
      { status: 503 },
    );
  }

  if (overRateLimit(user.id)) {
    return NextResponse.json(
      { error: "That is a lot of questions at once. Give it a moment." },
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
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "That message could not be sent." },
      { status: 400 },
    );
  }

  const supabase = await createClient();

  // ---- Resolve the conversation, creating one if needed -------------------
  let conversationId = parsed.data.conversationId ?? null;

  if (conversationId) {
    const { data: owned } = await supabase
      .from("ai_conversations")
      .select("id")
      .eq("id", conversationId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (!owned) {
      return NextResponse.json(
        { error: "That conversation could not be found." },
        { status: 404 },
      );
    }
  } else {
    const { data: created, error } = await supabase
      .from("ai_conversations")
      .insert({ user_id: user.id, title: titleFrom(parsed.data.message) })
      .select("id")
      .single();

    if (error || !created) {
      return NextResponse.json(
        { error: "We could not start that conversation." },
        { status: 500 },
      );
    }
    conversationId = created.id;
  }

  // ---- Gather history and context ----------------------------------------
  const { data: settings } = await supabase
    .from("user_settings")
    .select("ai_conversation_memory")
    .eq("user_id", user.id)
    .maybeSingle();

  const useMemory = settings?.ai_conversation_memory !== false;

  const { data: history } = useMemory
    ? await supabase
        .from("ai_messages")
        .select("role, content")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: false })
        .limit(AI_HISTORY_TURNS)
    : { data: [] };

  const context = await buildFinancialContext(user.id);

  await supabase.from("ai_messages").insert({
    conversation_id: conversationId,
    user_id: user.id,
    role: "user",
    content: parsed.data.message,
    used_financial_context: context.permitted,
  });

  const messages: Anthropic.MessageParam[] = [
    ...(history ?? [])
      .slice()
      .reverse()
      .map((row) => ({
        role: row.role as "user" | "assistant",
        content: row.content,
      })),
    { role: "user", content: parsed.data.message },
  ];

  const system = [
    buildSystemPrompt({
      hasFinancialContext: context.permitted,
      currency: context.currency,
    }),
    context.text,
  ]
    .filter(Boolean)
    .join("\n\n");

  const client = new Anthropic({ apiKey: ANTHROPIC_API_KEY });

  // The tool runs the real scoring engine against a copy of the user's live
  // figures, so a "what if" answer carries a measured number rather than a
  // guess. It never writes anything.
  const simulations: { description: string; delta: number }[] = [];

  const runSimulationTool = betaZodTool({
    name: "run_simulation",
    description:
      "Run the real Meridian scoring engine against the user's current figures with a change applied, and return the before and after scores. Use this whenever the user asks what a change would do to their score. Never estimate a score impact yourself.",
    inputSchema: simulationInputSchema,
    run: async (input) => {
      if (!context.scoringInput) {
        return JSON.stringify({
          error:
            "No financial data is available for this user, either because they have not entered any or because they have not permitted access to it. Tell them that rather than estimating.",
        });
      }
      const result = runSimulation(context.scoringInput, input);
      simulations.push({
        description: describeSimulation(input, context.currency),
        delta: result.delta,
      });
      return JSON.stringify(result);
    },
  });

  const encoder = new TextEncoder();
  let assistantText = "";

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: Record<string, unknown>) => {
        controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
      };

      try {
        send({ type: "start", conversationId, usedFinancialContext: context.permitted });

        const runner = client.beta.messages.toolRunner({
          model: AI_MODEL,
          max_tokens: AI_MAX_TOKENS,
          system,
          messages,
          tools: [runSimulationTool],
          stream: true,
        });

        for await (const messageStream of runner) {
          for await (const event of messageStream) {
            if (request.signal.aborted) break;

            if (event.type === "content_block_start" && event.content_block.type === "tool_use") {
              send({ type: "tool_start", name: event.content_block.name });
            }

            if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
              assistantText += event.delta.text;
              send({ type: "text", value: event.delta.text });
            }
          }
          if (request.signal.aborted) break;
        }

        for (const simulation of simulations) {
          send({ type: "simulation", ...simulation });
        }

        if (assistantText.trim().length > 0) {
          await supabase.from("ai_messages").insert({
            conversation_id: conversationId,
            user_id: user.id,
            role: "assistant",
            content: assistantText,
            used_financial_context: context.permitted,
          });
          // Touch the conversation so it sorts to the top of the list.
          await supabase
            .from("ai_conversations")
            .update({ updated_at: new Date().toISOString() })
            .eq("id", conversationId)
            .eq("user_id", user.id);
        }

        send({ type: "done", conversationId });
      } catch (error) {
        // Anything already streamed is kept, so a failure part-way through
        // does not lose the user's question or the partial answer.
        if (assistantText.trim().length > 0) {
          await supabase.from("ai_messages").insert({
            conversation_id: conversationId,
            user_id: user.id,
            role: "assistant",
            content: assistantText,
            used_financial_context: context.permitted,
          });
        }

        const message =
          error instanceof Anthropic.RateLimitError
            ? "The assistant is busy right now. Try again in a moment."
            : error instanceof Anthropic.AuthenticationError
              ? "The assistant's credentials were rejected. Check ANTHROPIC_API_KEY on the server."
              : error instanceof Anthropic.APIConnectionError
                ? "We could not reach the assistant. Check your connection and try again."
                : "The assistant ran into a problem. Your question was saved.";

        console.error("AI chat error", error);
        send({ type: "error", message });
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
