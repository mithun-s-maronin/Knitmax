"use client";

import { useEffect } from "react";
import Link from "next/link";
import { CircleAlert } from "lucide-react";

import { Button } from "@/components/ui/button";
import { PageShell } from "@/components/dashboard/page-header";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // The digest is the only safe handle on the server-side error; the message
    // itself is deliberately not shown, as it can carry internal detail.
    console.error("Dashboard error", error.digest ?? error.message);
  }, [error]);

  return (
    <PageShell width="narrow">
      <div className="flex flex-col items-center gap-4 rounded-2xl border border-dashed px-6 py-16 text-center">
        <div className="rounded-full bg-destructive/10 p-3 text-destructive-ink">
          <CircleAlert className="size-6" />
        </div>
        <div className="space-y-2">
          <h1 className="text-xl font-semibold">Something went wrong here</h1>
          <p className="mx-auto max-w-md text-sm text-muted-foreground text-pretty">
            Your data is safe — this is a problem loading the page, not with
            what is stored. Try again, and if it keeps happening, sign out and
            back in.
          </p>
          {error.digest ? (
            <p className="text-xs text-muted-foreground">Reference: {error.digest}</p>
          ) : null}
        </div>
        <div className="mt-2 flex flex-wrap justify-center gap-2">
          <Button onClick={reset}>Try again</Button>
          <Button asChild variant="outline">
            <Link href="/dashboard">Back to overview</Link>
          </Button>
        </div>
      </div>
    </PageShell>
  );
}
