import { cn } from "@/lib/utils";

/** The consistent title block every dashboard page opens with. */
export function PageHeader({
  title,
  description,
  actions,
  className,
}: {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between",
        className,
      )}
    >
      <div className="min-w-0">
        <h1 className="text-2xl font-semibold tracking-[-0.02em] sm:text-3xl">{title}</h1>
        {description ? (
          <p className="mt-2 max-w-2xl text-muted-foreground text-pretty">{description}</p>
        ) : null}
      </div>
      {actions ? <div className="no-print flex shrink-0 flex-wrap gap-2">{actions}</div> : null}
    </div>
  );
}

/** The page shell: consistent max width, gutters and vertical rhythm. */
export function PageShell({
  children,
  className,
  width = "default",
}: {
  children: React.ReactNode;
  className?: string;
  width?: "default" | "wide" | "narrow";
}) {
  return (
    <div
      className={cn(
        "mx-auto w-full px-4 py-7 sm:px-6 sm:py-9",
        width === "wide" && "max-w-7xl",
        width === "default" && "max-w-6xl",
        width === "narrow" && "max-w-3xl",
        className,
      )}
    >
      {children}
    </div>
  );
}
