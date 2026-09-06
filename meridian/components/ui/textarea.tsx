import * as React from "react";

import { cn } from "@/lib/utils";

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "flex min-h-20 w-full rounded-lg border bg-background px-3 py-2 text-sm shadow-sm transition-[color,box-shadow,border-color]",
        "placeholder:text-muted-foreground/70 field-sizing-content",
        "focus-visible:border-ring focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-ring/40",
        "disabled:cursor-not-allowed disabled:opacity-50",
        "aria-invalid:border-destructive aria-invalid:outline-destructive/40",
        className,
      )}
      {...props}
    />
  );
}

export { Textarea };
