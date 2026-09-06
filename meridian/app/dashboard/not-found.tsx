import Link from "next/link";

import { Button } from "@/components/ui/button";
import { PageShell } from "@/components/dashboard/page-header";

export default function DashboardNotFound() {
  return (
    <PageShell width="narrow">
      <div className="flex flex-col items-center gap-4 rounded-2xl border border-dashed px-6 py-16 text-center">
        <h1 className="text-xl font-semibold">We could not find that</h1>
        <p className="mx-auto max-w-md text-sm text-muted-foreground text-pretty">
          The record may have been deleted, or the link may belong to a
          different account. Nothing of yours has been lost.
        </p>
        <Button asChild className="mt-2">
          <Link href="/dashboard">Back to my overview</Link>
        </Button>
      </div>
    </PageShell>
  );
}
