import { CircleAlert, CircleCheck, ListChecks } from "lucide-react";

import { cn } from "@/lib/utils";
import type { PillarResult } from "@/lib/scoring";

/**
 * The three-part read on one pillar (§22): what is working, what is not, and
 * what to do about it — each backed by the component metrics underneath.
 */
export function PillarDetail({
  pillar,
  className,
}: {
  pillar: PillarResult;
  className?: string;
}) {
  const groups = [
    {
      key: "strengths",
      title: "What you're doing well",
      icon: CircleCheck,
      tone: "text-score-excellent",
      items: pillar.strengths,
      empty: "Nothing in this pillar is at full marks yet.",
    },
    {
      key: "weaknesses",
      title: "Areas to improve",
      icon: CircleAlert,
      tone: "text-score-needs-improvement",
      items: pillar.weaknesses,
      empty: "Nothing here needs attention.",
    },
    {
      key: "actions",
      title: "Recommended actions",
      icon: ListChecks,
      tone: "text-primary",
      items: pillar.recommendedActions,
      empty: "No action needed on this pillar.",
    },
  ];

  return (
    <div className={cn("grid gap-5 lg:grid-cols-3", className)}>
      {groups.map((group) => (
        <section key={group.key} className="surface p-5" aria-labelledby={`${pillar.key}-${group.key}`}>
          <h3
            id={`${pillar.key}-${group.key}`}
            className="flex items-center gap-2 text-sm font-semibold"
          >
            <group.icon className={cn("size-4", group.tone)} />
            {group.title}
          </h3>
          {group.items.length > 0 ? (
            <ul className="mt-3.5 space-y-2.5">
              {group.items.map((item) => (
                <li key={item} className="flex gap-2.5 text-sm text-muted-foreground text-pretty">
                  <span className={cn("mt-1.5 size-1.5 shrink-0 rounded-full bg-current", group.tone)} />
                  {item}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3.5 text-sm text-muted-foreground">{group.empty}</p>
          )}
        </section>
      ))}
    </div>
  );
}
