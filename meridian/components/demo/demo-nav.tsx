"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/demo", label: "Dashboard" },
  { href: "/demo/results", label: "Results" },
  { href: "/demo/simulator", label: "Simulator" },
  { href: "/demo/assessment", label: "Assessment" },
];

export function DemoNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="Demo" className="-mx-1 flex overflow-x-auto">
      {LINKS.map((link) => {
        const active =
          link.href === "/demo" ? pathname === "/demo" : pathname.startsWith(link.href);
        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "whitespace-nowrap rounded-md px-3 py-2 text-sm transition-colors",
              "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
              active
                ? "font-medium text-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
