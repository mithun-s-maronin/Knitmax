"use client";

import type { AnswerMap } from "@/lib/assessment/questions";
import { DEMO_ANSWERS } from "@/lib/demo/fixture";

const KEY = "meridian:demo:answers:v1";

/**
 * Demo state lives in sessionStorage and nowhere else.
 *
 * It is deliberately not the browser's long-term storage and never the
 * database: closing the tab ends the demo, and nothing a demo visitor types is
 * mixed with a real account's data (§63, §86).
 */
export function readDemoAnswers(): AnswerMap {
  if (typeof window === "undefined") return DEMO_ANSWERS;
  try {
    const raw = window.sessionStorage.getItem(KEY);
    if (!raw) return DEMO_ANSWERS;
    const parsed = JSON.parse(raw) as AnswerMap;
    return parsed && typeof parsed === "object" ? parsed : DEMO_ANSWERS;
  } catch {
    return DEMO_ANSWERS;
  }
}

export function writeDemoAnswers(answers: AnswerMap): void {
  try {
    window.sessionStorage.setItem(KEY, JSON.stringify(answers));
  } catch {
    // Private browsing, or a full quota. The demo still works from the
    // fixture — nothing important is lost.
  }
}

export function resetDemo(): void {
  try {
    window.sessionStorage.removeItem(KEY);
    window.localStorage.removeItem("meridian:demo-draft:v1");
  } catch {
    /* ignore */
  }
}

export function hasCustomDemoAnswers(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.sessionStorage.getItem(KEY) !== null;
  } catch {
    return false;
  }
}
