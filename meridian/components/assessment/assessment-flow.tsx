"use client";

import * as React from "react";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  CalendarCheck,
  Check,
  CloudOff,
  CreditCard,
  Loader2,
  PiggyBank,
  Receipt,
  Sparkles,
  UserRound,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  ASSESSMENT_SECTIONS,
  assessmentProgress,
  validateSection,
  visibleQuestions,
  type AnswerMap,
  type AnswerValue,
} from "@/lib/assessment/questions";
import { saveDraft, submitAssessment } from "@/lib/actions/assessment";
import { useIsHydrated } from "@/hooks/use-is-hydrated";

import { AssessmentProgress } from "./assessment-progress";
import { QuestionField } from "./question-field";

const SECTION_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  UserRound,
  Wallet,
  Receipt,
  PiggyBank,
  CreditCard,
  CalendarCheck,
};

const LOCAL_KEY = "meridian:assessment-draft:v1";

type SaveState = "idle" | "saving" | "saved" | "offline" | "error";

interface LocalDraft {
  answers: AnswerMap;
  currentStep: number;
  clientRevision: number;
  updatedAt: string;
}

function readLocalDraft(key: string): LocalDraft | null {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as LocalDraft;
    if (!parsed || typeof parsed !== "object" || !parsed.answers) return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeLocalDraft(key: string, draft: LocalDraft) {
  try {
    window.localStorage.setItem(key, JSON.stringify(draft));
  } catch {
    // A private window or a full quota. The server copy is authoritative
    // anyway, so this is a resilience bonus rather than a requirement.
  }
}

function clearLocalDraft(key: string) {
  try {
    window.localStorage.removeItem(key);
  } catch {
    /* ignore */
  }
}

/**
 * The multi-step assessment.
 *
 * The database is authoritative: every change is debounced and saved to the
 * server, and the browser copy exists only so a dropped connection or a closed
 * tab mid-question does not lose work. On load, a local draft newer than the
 * server's is offered back rather than applied silently — the user decides
 * which version wins (§74).
 */
export function AssessmentFlow({
  initialAnswers,
  initialStep,
  initialRevision,
  hasServerDraft,
  onSaveDraft = saveDraft,
  onSubmit = submitAssessment,
  exitHref = "/dashboard",
  storageKey = LOCAL_KEY,
}: {
  initialAnswers: AnswerMap;
  initialStep: number;
  initialRevision: number;
  hasServerDraft: boolean;
  /**
   * Overridden by the demo, which keeps everything in the browser and never
   * touches the database. Defaults to the real server actions.
   */
  onSaveDraft?: (payload: {
    answers: AnswerMap;
    currentStep: number;
    clientRevision: number;
  }) => Promise<{ error?: string; savedAt?: string; revision?: number }>;
  onSubmit?: (payload: { answers: AnswerMap }) => Promise<
    { error?: string; fieldErrors?: Record<string, string> } | void
  >;
  exitHref?: string;
  storageKey?: string;
}) {
  const reduceMotion = useReducedMotion();

  const [answers, setAnswers] = React.useState<AnswerMap>(initialAnswers);
  const [step, setStep] = React.useState(initialStep);
  const [furthestStep, setFurthestStep] = React.useState(initialStep);
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [saveState, setSaveState] = React.useState<SaveState>("idle");
  const [submitting, startSubmit] = React.useTransition();
  const [submitError, setSubmitError] = React.useState<string | null>(null);
  const [localDismissed, setLocalDismissed] = React.useState(false);

  const revisionRef = React.useRef(initialRevision);
  const dirtyRef = React.useRef(false);
  const headingRef = React.useRef<HTMLHeadingElement>(null);

  const sections = ASSESSMENT_SECTIONS;
  const section = sections[step];
  const questions = visibleQuestions(section, answers);
  const currency = typeof answers.currency === "string" ? answers.currency : "USD";
  const progress = assessmentProgress(answers);
  const isLast = step === sections.length - 1;
  const Icon = SECTION_ICONS[section.icon] ?? UserRound;

  // ---- Offer a newer local draft, rather than silently choosing for them ---
  // Read only once the browser is running, so the first client render matches
  // what the server produced.
  const hydrated = useIsHydrated();
  const localDraft = React.useMemo(
    () => (hydrated ? readLocalDraft(storageKey) : null),
    [hydrated, storageKey],
  );
  const pendingLocal =
    !localDismissed && localDraft && localDraft.clientRevision > initialRevision
      ? localDraft
      : null;

  React.useEffect(() => {
    // A local copy the server has already caught up with is just clutter.
    if (localDraft && localDraft.clientRevision <= initialRevision && !hasServerDraft) {
      clearLocalDraft(storageKey);
    }
  }, [localDraft, initialRevision, hasServerDraft, storageKey]);

  // ---- Debounced save --------------------------------------------------
  React.useEffect(() => {
    if (!dirtyRef.current) return;

    const revision = revisionRef.current + 1;
    revisionRef.current = revision;

    writeLocalDraft(storageKey, {
      answers,
      currentStep: step,
      clientRevision: revision,
      updatedAt: new Date().toISOString(),
    });

    const timer = setTimeout(async () => {
      try {
        const result = await onSaveDraft({
          answers,
          currentStep: step,
          clientRevision: revision,
        });
        setSaveState(result.error ? "error" : "saved");
      } catch {
        // Offline, or the request failed. The local copy still holds the work.
        setSaveState("offline");
      }
    }, 900);

    return () => clearTimeout(timer);
  }, [answers, step, onSaveDraft, storageKey]);

  // Retry the moment the connection comes back.
  React.useEffect(() => {
    const onOnline = () => {
      if (saveState !== "offline") return;
      void onSaveDraft({
        answers,
        currentStep: step,
        clientRevision: revisionRef.current,
      })
        .then((r) => setSaveState(r.error ? "error" : "saved"))
        .catch(() => setSaveState("offline"));
    };
    window.addEventListener("online", onOnline);
    return () => window.removeEventListener("online", onOnline);
  }, [saveState, answers, step, onSaveDraft]);

  const update = React.useCallback((id: string, value: AnswerValue) => {
    dirtyRef.current = true;
    setSaveState("saving");
    setAnswers((current) => ({ ...current, [id]: value }));
    setErrors((current) => {
      if (!current[id]) return current;
      const next = { ...current };
      delete next[id];
      return next;
    });
  }, []);

  const goTo = React.useCallback((next: number) => {
    setStep(next);
    setFurthestStep((f) => Math.max(f, next));
    dirtyRef.current = true;
    setSaveState("saving");
    // Move focus to the new section heading so a keyboard or screen-reader
    // user lands in the right place instead of at the top of the document.
    requestAnimationFrame(() => headingRef.current?.focus());
  }, []);

  const handleNext = () => {
    const sectionErrors = validateSection(section, answers);
    if (Object.keys(sectionErrors).length > 0) {
      setErrors(sectionErrors);
      const firstId = Object.keys(sectionErrors)[0];
      document.getElementById(firstId)?.scrollIntoView({ block: "center" });
      document.getElementById(firstId)?.focus?.();
      return;
    }
    setErrors({});
    if (!isLast) goTo(step + 1);
  };

  const handleSubmit = () => {
    const sectionErrors = validateSection(section, answers);
    if (Object.keys(sectionErrors).length > 0) {
      setErrors(sectionErrors);
      return;
    }

    setSubmitError(null);
    startSubmit(async () => {
      const result = await onSubmit({ answers });
      // A successful submit redirects, so reaching here means it failed.
      if (result?.fieldErrors) {
        setErrors(result.fieldErrors);
        const failing = sections.findIndex((s) =>
          visibleQuestions(s, answers).some((q) => result.fieldErrors?.[q.id]),
        );
        if (failing >= 0) goTo(failing);
      }
      setSubmitError(result?.error ?? "Something went wrong. Please try again.");
    });
    clearLocalDraft(storageKey);
  };

  const saveAndExit = async () => {
    try {
      await onSaveDraft({
        answers,
        currentStep: step,
        clientRevision: revisionRef.current + 1,
      });
      toast.success("Saved. Pick up where you left off whenever you like.");
    } catch {
      toast.error("We could not reach the server. Your answers are still on this device.");
    }
  };

  return (
    <div className="mx-auto w-full max-w-2xl px-5 py-8 sm:px-8 sm:py-12">
      {pendingLocal ? (
        <Alert variant="info" className="mb-7">
          <AlertCircle />
          <AlertTitle>You have newer answers on this device</AlertTitle>
          <AlertDescription>
            <p>
              Some answers were saved here but never reached the server. Restore
              them, or carry on with the version we have saved.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button
                size="sm"
                onClick={() => {
                  setAnswers(pendingLocal.answers);
                  setStep(pendingLocal.currentStep);
                  setFurthestStep((f) => Math.max(f, pendingLocal.currentStep));
                  revisionRef.current = pendingLocal.clientRevision;
                  dirtyRef.current = true;
                  setLocalDismissed(true);
                }}
              >
                Restore them
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  clearLocalDraft(storageKey);
                  setLocalDismissed(true);
                }}
              >
                Discard
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      ) : null}

      <AssessmentProgress
        sections={sections}
        currentStep={step}
        furthestStep={furthestStep}
        progress={progress}
        onJump={goTo}
      />

      <AnimatePresence mode="wait" initial={false}>
        <motion.section
          key={section.id}
          initial={reduceMotion ? false : { opacity: 0, x: 24 }}
          animate={{ opacity: 1, x: 0 }}
          exit={reduceMotion ? { opacity: 0 } : { opacity: 0, x: -24 }}
          transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
          className="surface mt-8 p-6 sm:p-8"
          aria-labelledby="section-heading"
        >
          <div className="flex items-center gap-3">
            <span className="rounded-xl bg-primary/10 p-2.5 text-primary">
              <Icon className="size-5" />
            </span>
            <div>
              <h1
                id="section-heading"
                ref={headingRef}
                tabIndex={-1}
                className="text-xl font-semibold tracking-[-0.015em] outline-none"
              >
                {section.title}
              </h1>
              <p className="text-sm text-muted-foreground text-pretty">
                {section.description}
              </p>
            </div>
          </div>

          <div className="mt-8 space-y-8">
            {questions.map((question) => (
              <QuestionField
                key={question.id}
                question={question}
                value={answers[question.id] ?? null}
                currency={currency}
                error={errors[question.id]}
                onChange={(value) => update(question.id, value)}
              />
            ))}
          </div>
        </motion.section>
      </AnimatePresence>

      {submitError ? (
        <Alert variant="destructive" className="mt-6" role="alert">
          <AlertCircle />
          <AlertTitle>We could not finish that</AlertTitle>
          <AlertDescription>{submitError}</AlertDescription>
        </Alert>
      ) : null}

      <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:items-center">
        <Button
          type="button"
          variant="outline"
          size="lg"
          onClick={() => goTo(Math.max(step - 1, 0))}
          disabled={step === 0 || submitting}
          className="sm:w-auto"
        >
          <ArrowLeft className="size-4" />
          Back
        </Button>

        <div className="flex-1" />

        {isLast ? (
          <Button type="button" size="lg" onClick={handleSubmit} loading={submitting}>
            <Sparkles className="size-4" />
            {submitting ? "Calculating your score" : "Calculate my score"}
          </Button>
        ) : (
          <Button type="button" size="lg" onClick={handleNext}>
            Continue
            <ArrowRight className="size-4" />
          </Button>
        )}
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t pt-5 text-sm">
        <SaveIndicator state={saveState} />
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={saveAndExit}
            className="rounded text-muted-foreground underline underline-offset-4 hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            Save and continue later
          </button>
          <Link
            href={exitHref}
            className="rounded text-muted-foreground underline underline-offset-4 hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            Exit
          </Link>
        </div>
      </div>
    </div>
  );
}

function SaveIndicator({ state }: { state: SaveState }) {
  const content = {
    idle: null,
    saving: (
      <>
        <Loader2 className="size-3.5 animate-spin" /> Saving
      </>
    ),
    saved: (
      <>
        <Check className="size-3.5 text-score-excellent-ink" /> Saved
      </>
    ),
    offline: (
      <>
        <CloudOff className="size-3.5 text-score-fair-ink" /> Saved on this device — we
        will sync when you are back online
      </>
    ),
    error: (
      <>
        <AlertCircle className="size-3.5 text-destructive-ink" /> Could not save
      </>
    ),
  }[state];

  return (
    <p
      aria-live="polite"
      className={cn(
        "flex items-center gap-1.5 text-xs text-muted-foreground",
        !content && "sr-only",
      )}
    >
      {content}
    </p>
  );
}
