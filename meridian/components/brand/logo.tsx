import Link from "next/link";

import { cn } from "@/lib/utils";

/**
 * The Meridian mark: a rising arc crossed by a meridian line.
 * Drawn rather than imported so it inherits currentColor in both themes.
 */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      className={cn("size-7", className)}
      aria-hidden
    >
      <circle cx="16" cy="16" r="14" className="stroke-current opacity-25" strokeWidth="2" />
      <path
        d="M4 21.5C8.5 21.5 10.5 6 16 6s7.5 15.5 12 15.5"
        className="stroke-current"
        strokeWidth="2.4"
        strokeLinecap="round"
      />
      <path d="M16 2v28" className="stroke-current opacity-40" strokeWidth="1.6" />
    </svg>
  );
}

export function Logo({
  className,
  href = "/",
  showWordmark = true,
}: {
  className?: string;
  href?: string | null;
  showWordmark?: boolean;
}) {
  const content = (
    <span className={cn("inline-flex items-center gap-2 text-primary", className)}>
      <LogoMark />
      {showWordmark ? (
        <span className="text-lg font-semibold tracking-[-0.02em] text-foreground">
          Meridian
        </span>
      ) : null}
    </span>
  );

  if (!href) return content;

  return (
    <Link
      href={href}
      className="rounded-md focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"
      aria-label="Meridian home"
    >
      {content}
    </Link>
  );
}
