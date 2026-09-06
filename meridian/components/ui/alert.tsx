import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const alertVariants = cva(
  "relative grid w-full grid-cols-[0_1fr] items-start gap-y-1 rounded-xl border px-4 py-3.5 text-sm has-[>svg]:grid-cols-[calc(var(--spacing)*4.5)_1fr] has-[>svg]:gap-x-3 [&>svg]:size-4.5 [&>svg]:translate-y-0.5",
  {
    variants: {
      variant: {
        default: "bg-card text-card-foreground",
        info: "border-primary/25 bg-primary/8 text-foreground [&>svg]:text-primary",
        success:
          "border-score-excellent/30 bg-score-excellent/10 text-foreground [&>svg]:text-score-excellent-ink",
        warning:
          "border-score-fair/35 bg-score-fair/12 text-foreground [&>svg]:text-score-needs-improvement-ink",
        destructive:
          "border-destructive/30 bg-destructive/8 text-foreground [&>svg]:text-destructive-ink",
      },
    },
    defaultVariants: { variant: "default" },
  },
);

function Alert({
  className,
  variant,
  ...props
}: React.ComponentProps<"div"> & VariantProps<typeof alertVariants>) {
  return (
    <div
      data-slot="alert"
      role="alert"
      className={cn(alertVariants({ variant }), className)}
      {...props}
    />
  );
}

function AlertTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn("col-start-2 min-h-4 font-medium tracking-tight", className)}
      {...props}
    />
  );
}

function AlertDescription({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "col-start-2 grid justify-items-start gap-1 text-sm text-muted-foreground text-pretty [&_p]:leading-relaxed",
        className,
      )}
      {...props}
    />
  );
}

export { Alert, AlertTitle, AlertDescription };
