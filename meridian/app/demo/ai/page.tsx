"use client";

import * as React from "react";

import { PageHeader, PageShell } from "@/components/dashboard/page-header";
import { DemoChat } from "@/components/demo/demo-chat";
import { DEMO_ANSWERS } from "@/lib/demo/fixture";
import { readDemoAnswers } from "@/components/demo/demo-store";
import { useIsHydrated } from "@/hooks/use-is-hydrated";

export default function DemoAiPage() {
  const hydrated = useIsHydrated();
  const answers = React.useMemo(
    () => (hydrated ? readDemoAnswers() : DEMO_ANSWERS),
    [hydrated],
  );

  return (
    <PageShell width="wide">
      <PageHeader
        title="AI assistant"
        description="Ask about the demo profile. The assistant is given the scores and figures the engine produced, and is told not to invent any others."
      />
      <div className="mt-7">
        <DemoChat answers={answers} />
      </div>
    </PageShell>
  );
}
