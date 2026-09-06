"use client";

import { Check } from "lucide-react";

import { cn } from "@/lib/utils";
import type { AssessmentSection } from "@/lib/assessment/questions";

/**
 * Step count, a progress bar, and the section rail.
 *
 * The rail is a list of buttons on desktop so a user can jump back to a
 * section they have already completed; on mobile it collapses to the bar and
 * the "Step n of m" line, which is all that fits usefully.
 */
export function AssessmentProgress({
  sections,
  currentStep,
  furthestStep,
  progress,
  onJump,
}: {
  sections: AssessmentSection[];
  currentStep: number;
  furthestStep: number;
  progress: number;
  onJump: (step: number) => void;
}) {
  return (
    <div>
      <div className="flex items-baseline justify-between gap-4">
        <p className="text-sm font-medium">
          Step {currentStep + 1} of {sections.length}
          <span className="ml-2 font-normal text-muted-foreground">
            {sections[currentStep]?.title}
          </span>
        </p>
        <p className="text-sm tabular text-muted-foreground">
          {Math.round(progress * 100)}% complete
        </p>
      </div>

      <div
        className="mt-2.5 h-1.5 w-full overflow-hidden rounded-full bg-muted"
        role="progressbar"
        aria-valuenow={Math.round(progress * 100)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Assessment progress"
      >
        <div
          className="h-full rounded-full bg-primary transition-[width] duration-500 ease-out"
          style={{ width: `${Math.max(progress * 100, 2)}%` }}
        />
      </div>

      <ol className="mt-6 hidden gap-1 md:flex" aria-label="Sections">
        {sections.map((section, index) => {
          const done = index < furthestStep;
          const current = index === currentStep;
          const reachable = index <= furthestStep;

          return (
            <li key={section.id} className="flex-1">
              <button
                type="button"
                disabled={!reachable}
                onClick={() => onJump(index)}
                aria-current={current ? "step" : undefined}
                className={cn(
                  "group flex w-full flex-col gap-2 rounded-lg py-1 text-left transition-colors",
                  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                  reachable ? "cursor-pointer" : "cursor-not-allowed opacity-50",
                )}
              >
                <span
                  className={cn(
                    "h-1 rounded-full transition-colors",
                    current ? "bg-primary" : done ? "bg-primary/45" : "bg-border",
                  )}
                />
                <span className="flex items-center gap-1.5 text-xs">
                  {done ? (
                    <Check className="size-3 text-primary" aria-hidden />
                  ) : null}
                  <span
                    className={cn(
                      current ? "font-medium text-foreground" : "text-muted-foreground",
                      reachable && !current && "group-hover:text-foreground",
                    )}
                  >
                    {section.title}
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
