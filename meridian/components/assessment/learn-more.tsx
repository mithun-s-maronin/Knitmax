"use client";

import { HelpCircle } from "lucide-react";

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

/** The contextual education affordance next to a question (§66). */
export function LearnMore({ title, body }: { title: string; body: string }) {
  return (
    <Popover>
      <PopoverTrigger
        className="inline-flex items-center gap-1 rounded text-xs font-medium text-primary underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        aria-label={`Learn more: ${title}`}
      >
        <HelpCircle className="size-3.5" />
        Learn more
      </PopoverTrigger>
      <PopoverContent align="start" className="w-80">
        <p className="text-sm font-semibold">{title}</p>
        <p className="mt-2 text-sm text-muted-foreground text-pretty">{body}</p>
      </PopoverContent>
    </Popover>
  );
}
