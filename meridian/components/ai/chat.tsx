"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowUp,
  Bot,
  CircleAlert,
  Loader2,
  ShieldOff,
  Sparkles,
  Square,
  TrendingUp,
  User,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { SUGGESTED_PROMPTS } from "./suggested-prompts";
import type { AiMessageRow } from "@/types/database";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  pending?: boolean;
}

interface SimulationNote {
  description: string;
  delta: number;
}

/**
 * The assistant conversation.
 *
 * The browser sends only the message text and which conversation it belongs
 * to. The financial context, the system prompt and the model are all decided
 * on the server, so nothing here can widen what the assistant sees.
 */
export function Chat({
  conversationId,
  initialMessages,
  initialPrompt,
  aiConfigured,
  dataPermission,
}: {
  conversationId: string | null;
  initialMessages: AiMessageRow[];
  initialPrompt?: string;
  aiConfigured: boolean;
  dataPermission: boolean;
}) {
  const router = useRouter();

  const [messages, setMessages] = React.useState<ChatMessage[]>(() =>
    initialMessages.map((m) => ({ id: m.id, role: m.role, content: m.content })),
  );
  const [input, setInput] = React.useState(initialPrompt ?? "");
  const [streaming, setStreaming] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [simulations, setSimulations] = React.useState<SimulationNote[]>([]);
  const [toolRunning, setToolRunning] = React.useState(false);

  const abortRef = React.useRef<AbortController | null>(null);
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const inputRef = React.useRef<HTMLTextAreaElement>(null);

  // Keep the newest message in view as it streams.
  React.useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, toolRunning]);

  const send = React.useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || streaming) return;

      setError(null);
      setSimulations([]);
      setInput("");

      const userMessage: ChatMessage = {
        id: `local-${Date.now()}`,
        role: "user",
        content: trimmed,
      };
      const assistantId = `local-${Date.now()}-a`;

      setMessages((current) => [
        ...current,
        userMessage,
        { id: assistantId, role: "assistant", content: "", pending: true },
      ]);
      setStreaming(true);

      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const response = await fetch("/api/ai/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ conversationId, message: trimmed }),
          signal: controller.signal,
        });

        if (!response.ok || !response.body) {
          const payload = await response.json().catch(() => null);
          throw new Error(
            payload?.error ?? "The assistant could not be reached just now.",
          );
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let newConversationId: string | null = null;

        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";

          for (const line of lines) {
            if (!line.trim()) continue;
            let event: Record<string, unknown>;
            try {
              event = JSON.parse(line);
            } catch {
              continue;
            }

            if (event.type === "start" && typeof event.conversationId === "string") {
              newConversationId = event.conversationId;
            }
            if (event.type === "tool_start") setToolRunning(true);
            if (event.type === "text" && typeof event.value === "string") {
              setToolRunning(false);
              const chunk = event.value;
              setMessages((current) =>
                current.map((m) =>
                  m.id === assistantId
                    ? { ...m, content: m.content + chunk, pending: false }
                    : m,
                ),
              );
            }
            if (event.type === "simulation") {
              setSimulations((current) => [
                ...current,
                {
                  description: String(event.description ?? ""),
                  delta: Number(event.delta ?? 0),
                },
              ]);
            }
            if (event.type === "error" && typeof event.message === "string") {
              setError(event.message);
            }
          }
        }

        setMessages((current) =>
          current.map((m) => (m.id === assistantId ? { ...m, pending: false } : m)),
        );

        // A brand new conversation gets its own URL, so it can be returned to.
        if (!conversationId && newConversationId) {
          router.replace(`/dashboard/ai?c=${newConversationId}`);
          router.refresh();
        } else {
          router.refresh();
        }
      } catch (caught) {
        if ((caught as Error).name === "AbortError") {
          setMessages((current) =>
            current
              .map((m) => (m.id === assistantId ? { ...m, pending: false } : m))
              .filter((m) => m.id !== assistantId || m.content.length > 0),
          );
        } else {
          setError((caught as Error).message);
          setMessages((current) => current.filter((m) => m.id !== assistantId));
        }
      } finally {
        setStreaming(false);
        setToolRunning(false);
        abortRef.current = null;
      }
    },
    [conversationId, router, streaming],
  );

  const stop = () => abortRef.current?.abort();

  const empty = messages.length === 0;

  return (
    <div className="flex h-[calc(100dvh-13rem)] min-h-96 flex-col lg:h-[calc(100dvh-9rem)]">
      {!aiConfigured ? (
        <Alert variant="warning" className="mb-4">
          <CircleAlert />
          <AlertTitle>The assistant is not configured</AlertTitle>
          <AlertDescription>
            This deployment has no <code>ANTHROPIC_API_KEY</code> set, so the
            assistant cannot answer. Everything else in Meridian — your score,
            insights, alerts and action plan — is calculated without it and
            works normally.
          </AlertDescription>
        </Alert>
      ) : null}

      {!dataPermission ? (
        <Alert variant="info" className="mb-4">
          <ShieldOff />
          <AlertTitle>The assistant cannot see your finances</AlertTitle>
          <AlertDescription>
            <p>
              You have turned off permission for it to use your financial data,
              so it will answer general questions only — it is not sent any of
              your figures.
            </p>
            <Link
              href="/dashboard/settings#privacy"
              className="mt-2 inline-block font-medium text-foreground underline underline-offset-4"
            >
              Change this in Settings
            </Link>
          </AlertDescription>
        </Alert>
      ) : null}

      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto rounded-2xl border bg-card p-4 sm:p-6"
        role="log"
        aria-live="polite"
        aria-label="Conversation"
      >
        {empty ? (
          <div className="flex h-full flex-col items-center justify-center py-10 text-center">
            <span className="rounded-2xl bg-primary/10 p-3 text-primary">
              <Bot className="size-6" />
            </span>
            <h2 className="mt-4 text-lg font-semibold">Ask about your money</h2>
            <p className="mt-2 max-w-md text-sm text-muted-foreground text-pretty">
              The assistant reads your actual figures and the score the engine
              produced. It never makes a score up — when a question needs a
              number, it runs the real calculation.
            </p>

            <div className="mt-7 grid w-full max-w-lg gap-2 sm:grid-cols-2">
              {SUGGESTED_PROMPTS.map((suggestion) => (
                <button
                  key={suggestion.label}
                  type="button"
                  disabled={!aiConfigured}
                  onClick={() => send(suggestion.prompt)}
                  className="rounded-xl border p-3 text-left text-sm transition-colors hover:bg-accent/60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:opacity-50"
                >
                  <span className="flex items-center gap-2 font-medium">
                    <Sparkles className="size-3.5 text-primary" />
                    {suggestion.label}
                  </span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <ul className="space-y-6">
            {messages.map((message) => (
              <li
                key={message.id}
                className={cn(
                  "flex gap-3",
                  message.role === "user" && "flex-row-reverse",
                )}
              >
                <span
                  aria-hidden
                  className={cn(
                    "mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full",
                    message.role === "user"
                      ? "bg-primary/12 text-primary"
                      : "bg-muted text-muted-foreground",
                  )}
                >
                  {message.role === "user" ? (
                    <User className="size-3.5" />
                  ) : (
                    <Bot className="size-3.5" />
                  )}
                </span>

                <div
                  className={cn(
                    "min-w-0 max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed",
                    message.role === "user"
                      ? "rounded-tr-sm bg-primary text-primary-foreground"
                      : "rounded-tl-sm bg-muted",
                  )}
                >
                  <span className="sr-only">
                    {message.role === "user" ? "You said: " : "Assistant said: "}
                  </span>
                  {message.content ? (
                    <div className="space-y-3 whitespace-pre-wrap text-pretty">
                      {message.content}
                    </div>
                  ) : (
                    <span className="flex items-center gap-2 text-muted-foreground">
                      <Loader2 className="size-3.5 animate-spin" />
                      Thinking
                    </span>
                  )}
                </div>
              </li>
            ))}

            {toolRunning ? (
              <li className="flex items-center gap-2 pl-10 text-xs text-muted-foreground">
                <Loader2 className="size-3.5 animate-spin" />
                Running the scoring engine on that scenario
              </li>
            ) : null}
          </ul>
        )}

        {simulations.length > 0 ? (
          <ul className="mt-6 space-y-2 pl-10">
            {simulations.map((simulation, i) => (
              <li key={i}>
                <Badge
                  variant="outline"
                  className="border-score-excellent/35 text-score-excellent-ink"
                >
                  <TrendingUp className="size-3" />
                  Measured by the engine: {simulation.description} ={" "}
                  {simulation.delta > 0 ? "+" : ""}
                  {simulation.delta} points
                </Badge>
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      {error ? (
        <Alert variant="destructive" className="mt-3" role="alert">
          <CircleAlert />
          <AlertDescription>
            <p>{error}</p>
            <Button
              size="sm"
              variant="outline"
              className="mt-2 bg-background"
              onClick={() => {
                const last = [...messages].reverse().find((m) => m.role === "user");
                if (last) send(last.content);
              }}
            >
              Try again
            </Button>
          </AlertDescription>
        </Alert>
      ) : null}

      <form
        className="mt-3 flex items-end gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          send(input);
        }}
      >
        <label htmlFor="chat-input" className="sr-only">
          Ask the assistant
        </label>
        <Textarea
          id="chat-input"
          ref={inputRef}
          value={input}
          onChange={(event) => setInput(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              send(input);
            }
          }}
          disabled={!aiConfigured}
          rows={1}
          placeholder={
            aiConfigured
              ? "Ask about your score, your spending, your debt…"
              : "The assistant is not configured on this deployment"
          }
          className="max-h-40 min-h-11 flex-1 resize-none py-2.5"
        />

        {streaming ? (
          <Button type="button" size="icon" variant="outline" onClick={stop} aria-label="Stop">
            <Square className="size-4" />
          </Button>
        ) : (
          <Button
            type="submit"
            size="icon"
            disabled={!input.trim() || !aiConfigured}
            aria-label="Send message"
          >
            <ArrowUp className="size-4" />
          </Button>
        )}
      </form>

      <p className="mt-2 text-center text-xs text-muted-foreground text-pretty">
        Meridian gives general information about your own figures, not financial
        advice. Scores always come from the calculation, never from the
        assistant.
      </p>
    </div>
  );
}
