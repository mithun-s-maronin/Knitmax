import "server-only";

/**
 * AI provider configuration.
 *
 * The key is read only on the server and has no NEXT_PUBLIC_ prefix, so it can
 * never be bundled into client code. Every AI request goes through an
 * authenticated route handler; the browser never talks to Anthropic (§69).
 */
export const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY ?? "";

/** The model the assistant runs on. Override only if you know why. */
export const AI_MODEL = process.env.ANTHROPIC_MODEL ?? "claude-opus-5";

export const AI_MAX_TOKENS = 8000;

/** How many previous turns to replay. Older context is summarised instead. */
export const AI_HISTORY_TURNS = 12;

export function isAiConfigured(): boolean {
  return ANTHROPIC_API_KEY.length > 0;
}
