import Link from "next/link";
import { FlaskConical } from "lucide-react";

import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/providers/theme-toggle";
import { DemoNav } from "@/components/demo/demo-nav";

export const metadata = {
  title: {
    default: "Demo",
    template: "%s · Meridian demo",
  },
};

export default function DemoLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col">
      {/*
        The banner is permanent and unmissable on purpose. A demo that looks
        like the real product is only honest if it says so on every screen.
      */}
      <div className="bg-primary px-4 py-2 text-center text-sm text-primary-foreground">
        <p className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1">
          <FlaskConical className="size-3.5 shrink-0" aria-hidden />
          <span>
            <strong className="font-semibold">Demo mode.</strong> Everything here
            is made-up data for one example person. Nothing is saved.
          </span>
          <Link
            href="/signup"
            className="rounded font-semibold underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current"
          >
            Create a real account
          </Link>
        </p>
      </div>

      <header className="sticky top-0 z-30 border-b bg-background/85 backdrop-blur-md">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center gap-4 px-4 sm:px-6">
          <Logo href="/demo" />
          <DemoNav />
          <div className="ml-auto flex items-center gap-2">
            <ThemeToggle />
            <Button asChild size="sm">
              <Link href="/signup">Get my real score</Link>
            </Button>
          </div>
        </div>
      </header>

      <main id="main" className="flex-1">
        {children}
      </main>
    </div>
  );
}
