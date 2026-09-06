import Link from "next/link";

import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="px-5 py-5 sm:px-8">
        <Logo />
      </header>
      <main
        id="main"
        className="flex flex-1 flex-col items-center justify-center px-5 pb-24 text-center"
      >
        <p className="text-sm font-medium uppercase tracking-[0.16em] text-muted-foreground">
          404
        </p>
        <h1 className="mt-4 text-3xl font-semibold tracking-[-0.025em] sm:text-4xl">
          We could not find that page
        </h1>
        <p className="mt-4 max-w-md text-muted-foreground text-pretty">
          The link may be old, or the page may have moved. Everything in your
          account is where you left it.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Button asChild>
            <Link href="/dashboard">Go to my dashboard</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/">Back to the home page</Link>
          </Button>
        </div>
      </main>
    </div>
  );
}
