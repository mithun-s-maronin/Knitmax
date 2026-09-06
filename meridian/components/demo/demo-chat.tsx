"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowUp, Bot, CircleAlert, Loader2, Sparkles, Square, User } from "lucide-react";

import { cn } from "@/lib/utils";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { SUGGESTED_PROMPTS } from "@/components/ai/suggested-prompts";
import type { AnswerMap } from "@/lib/assessment/questions";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

/**
 * The demo assistant.
 *
 * Talks to an unauthenticated route that never touches the database and is
 * rate limited per IP. The answers are about the demo profile, not anybody's
 * real finances.
 */
export function DemoChat({ answers }: { answers: AnswerMap }) {
  const [messages, setMessages] = React.useState<Message[]>([]);
  const [input, setInput] = React.useState("");
  const [streaming, setStreaming] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const abortRef = React.useRef<AbortController | null>(null);
  const scrollRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages]);

  const send = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || streaming) return;

    setError(null);
    setInput("");

    const assistantId = `a-${Date.now()}`;
    const history = messages.slice(-6).map((m) => ({ role: m.role, content: m.content }));

    setMessages((current) => [
      ...current,
      { id: `u-${Date.now()}`, role: "user", content: trimmed },
      { id: assistantId, role: "assistant", content: "" },
    ]);
    setStreaming(true);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const response = await fetch("/api/ai/demo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: trimmed, answers, history }),
        signal: controller.signal,
      });

      if (!response.ok || !response.body) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.error ?? "The demo assistant is unavailable.");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const event = JSON.parse(line) as Record<string, unknown>;
            if (event.type === "text" && typeof event.value === "string") {
              const chunk = event.value;
              setMessages((current) =>
                current.map((m) =>
                  m.id === assistantId ? { ...m, content: m.content + chunk } : m,
                ),
              );
            }
            if (event.type === "error" && typeof event.message === "string") {
              setError(event.message);
            }
          } catch {
            /* a partial line; the next chunk completes it */
          }
        }
      }
    } catch (caught) {
      if ((caught as Error).name !== "AbortError") {
        setError((caught as Error).message);
        setMessages((current) => current.filter((m) => m.id !== assistantId));
      }
    } finally {
      setStreaming(false);
      abortRef.current = null;
    }
  };

  return (
    <div className="flex h-[calc(100dvh-16rem)] min-h-96 flex-col">
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto rounded-2xl border bg-card p-4 sm:p-6"
        role="log"
        aria-live="polite"
        aria-label="Conversation"
      >
        {messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center py-10 text-center">
            <span className="rounded-2xl bg-primary/10 p-3 text-primary">
              <Bot className="size-6" />
            </span>
            <h2 className="mt-4 text-lg font-semibold">Ask about the demo profile</h2>
            <p className="mt-2 max-w-md text-sm text-muted-foreground text-pretty">
              The assistant is given the example person&apos;s real scores and
              figures from the engine, and told not to invent any others.
            </p>
            <div className="mt-7 grid w-full max-w-lg gap-2 sm:grid-cols-2">
              {SUGGESTED_PROMPTS.slice(0, 4).map((suggestion) => (
                <button
                  key={suggestion.label}
                  type="button"
                  onClick={() => send(suggestion.prompt)}
                  className="rounded-xl border p-3 text-left text-sm transition-colors hover:bg-accent/60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
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
                className={cn("flex gap-3", message.role === "user" && "flex-row-reverse")}
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
                  {message.content ? (
                    <div className="whitespace-pre-wrap text-pretty">{message.content}</div>
                  ) : (
                    <span className="flex items-center gap-2 text-muted-foreground">
                      <Loader2 className="size-3.5 animate-spin" />
                      Thinking
                    </span>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {error ? (
        <Alert variant="warning" className="mt-3" role="alert">
          <CircleAlert />
          <AlertDescription>
            <p>{error}</p>
            <Link
              href="/signup"
              className="mt-2 inline-block font-medium text-foreground underline underline-offset-4"
            >
              Create an account for the full assistant
            </Link>
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
        <label htmlFor="demo-chat-input" className="sr-only">
          Ask the assistant
        </label>
        <Textarea
          id="demo-chat-input"
          value={input}
          onChange={(event) => setInput(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              send(input);
            }
          }}
          rows={1}
          placeholder="Ask about this profile's score, spending or debt…"
          className="max-h-40 min-h-11 flex-1 resize-none py-2.5"
        />
        {streaming ? (
          <Button
            type="button"
            size="icon"
            variant="outline"
            onClick={() => abortRef.current?.abort()}
            aria-label="Stop"
          >
            <Square className="size-4" />
          </Button>
        ) : (
          <Button type="submit" size="icon" disabled={!input.trim()} aria-label="Send message">
            <ArrowUp className="size-4" />
          </Button>
        )}
      </form>

      <p className="mt-2 text-center text-xs text-muted-foreground text-pretty">
        A limited demo assistant with no memory between visits. The full one
        remembers your conversations and can run the scoring engine on your own
        what-if questions.
      </p>
    </div>
  );
}
