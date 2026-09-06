"use client";

import { Printer } from "lucide-react";

import { Button } from "@/components/ui/button";

/**
 * Print, or save as PDF.
 *
 * The browser's own print pipeline produces better PDFs than a client-side
 * renderer would — real text, selectable and searchable, at the device's
 * resolution — so the report is styled for print rather than rasterised.
 */
export function PrintButton({ label = "Print or save as PDF" }: { label?: string }) {
  return (
    <Button onClick={() => window.print()} variant="outline">
      <Printer className="size-4" />
      {label}
    </Button>
  );
}
