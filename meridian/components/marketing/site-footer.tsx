import Link from "next/link";

import { Logo } from "@/components/brand/logo";

const COLUMNS = [
  {
    title: "Product",
    links: [
      { href: "/assessment", label: "Take the assessment" },
      { href: "/demo", label: "Try the demo" },
      { href: "/#score", label: "The score" },
      { href: "/#pillars", label: "Four pillars" },
    ],
  },
  {
    title: "Learn",
    links: [
      { href: "/#how", label: "How it works" },
      { href: "/#transparency", label: "How the score is calculated" },
      { href: "/#assistant", label: "AI assistant" },
      { href: "/#faq", label: "FAQ" },
    ],
  },
  {
    title: "Account",
    links: [
      { href: "/login", label: "Sign in" },
      { href: "/signup", label: "Create an account" },
      { href: "/dashboard/settings", label: "Settings" },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="border-t bg-muted/25">
      <div className="mx-auto w-full max-w-6xl px-5 py-14 sm:px-8">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-[1.4fr_repeat(3,1fr)]">
          <div>
            <Logo />
            <p className="mt-4 max-w-xs text-sm text-muted-foreground text-pretty">
              A clear read on where your money stands, and a plan for what to do
              next. Your score is calculated by a published formula, not a
              black box.
            </p>
          </div>

          {COLUMNS.map((column) => (
            <div key={column.title}>
              <h2 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                {column.title}
              </h2>
              <ul className="mt-4 space-y-2.5">
                {column.links.map((link) => (
                  <li key={link.href + link.label}>
                    <Link
                      href={link.href}
                      className="rounded text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 flex flex-col gap-3 border-t pt-6 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} Meridian.</p>
          <p className="max-w-xl text-pretty">
            Meridian gives you general information about your own finances. It is
            not financial, tax or legal advice, and it does not know your full
            circumstances.
          </p>
        </div>
      </div>
    </footer>
  );
}
