import Link from "next/link";

import { Logo } from "@/components/brand/logo";
import { ThemeToggle } from "@/components/providers/theme-toggle";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-dvh flex-col">
      <div className="aurora pointer-events-none absolute inset-0 -z-10 opacity-80" aria-hidden />

      <header className="flex items-center justify-between px-5 py-5 sm:px-8">
        <Logo />
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Link
            href="/demo"
            className="rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            Try the demo
          </Link>
        </div>
      </header>

      <main id="main" className="flex flex-1 items-center justify-center px-5 py-10 sm:px-8">
        <div className="w-full max-w-md">{children}</div>
      </main>

      <footer className="px-5 py-6 text-center text-xs text-muted-foreground sm:px-8">
        Meridian gives you general information about your own finances, not
        financial advice.
      </footer>
    </div>
  );
}
