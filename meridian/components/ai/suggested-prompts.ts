/** The starting points offered on an empty chat (§26). */
export const SUGGESTED_PROMPTS = [
  {
    label: "Explain my score",
    prompt:
      "Explain my Financial Health Score. Which pillar is holding it back, and why?",
  },
  {
    label: "Improve my score",
    prompt:
      "What are the three highest-value things I could do to improve my score, in order?",
  },
  {
    label: "Analyse my spending",
    prompt:
      "Analyse my spending. Where is the money going, and where are the easiest savings?",
  },
  {
    label: "Build a savings plan",
    prompt:
      "Build me a savings plan that gets my emergency fund to six months of essential costs.",
  },
  {
    label: "Help me manage debt",
    prompt:
      "Help me plan my debt repayment. What should I pay off first, and what would it save me?",
  },
  {
    label: "Explain my dashboard",
    prompt:
      "Walk me through my dashboard. What do the numbers on it actually mean for me?",
  },
] as const;
