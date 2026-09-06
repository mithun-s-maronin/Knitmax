"use client";

import { useRouter } from "next/navigation";

import { AssessmentFlow } from "@/components/assessment/assessment-flow";
import { validateAllSections } from "@/lib/assessment/schema";
import type { AnswerMap } from "@/lib/assessment/questions";
import { DEMO_CURRENCY } from "@/lib/demo/fixture";
import { readDemoAnswers, writeDemoAnswers } from "@/components/demo/demo-store";

/**
 * The demo assessment.
 *
 * The identical flow the real product uses, with the two server calls swapped
 * for browser-local handlers — nothing reaches the database, and the answers
 * live in sessionStorage until the tab closes.
 */
export default function DemoAssessmentPage() {
  const router = useRouter();

  const saveDraft = async (payload: {
    answers: AnswerMap;
    currentStep: number;
    clientRevision: number;
  }) => {
    writeDemoAnswers(payload.answers);
    return { savedAt: new Date().toISOString(), revision: payload.clientRevision };
  };

  const submit = async (payload: { answers: AnswerMap }) => {
    // The same validation the server would run.
    const errors = validateAllSections(payload.answers);
    if (Object.keys(errors).length > 0) {
      return { fieldErrors: errors, error: "Some answers still need attention." };
    }

    writeDemoAnswers(payload.answers);
    router.push("/demo/results");
  };

  return (
    <AssessmentFlow
      initialAnswers={{ currency: DEMO_CURRENCY, ...readDemoAnswers() }}
      initialStep={0}
      initialRevision={0}
      hasServerDraft={false}
      onSaveDraft={saveDraft}
      onSubmit={submit}
      exitHref="/demo"
      storageKey="meridian:demo-draft:v1"
    />
  );
}
