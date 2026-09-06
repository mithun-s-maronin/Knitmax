"use client";

import { useRouter, useSearchParams } from "next/navigation";

import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

/** Chooses which two assessments to compare; the choice lives in the URL. */
export function ComparisonPicker({
  assessments,
  beforeId,
  afterId,
  className,
}: {
  assessments: { id: string; label: string }[];
  beforeId: string;
  afterId: string;
  className?: string;
}) {
  const router = useRouter();
  const params = useSearchParams();

  const go = (key: "a" | "b", value: string) => {
    const next = new URLSearchParams(params.toString());
    next.set(key, value);
    router.replace(`/dashboard/history/compare?${next.toString()}`);
  };

  return (
    <div className={cn("grid gap-4 sm:grid-cols-2", className)}>
      <div className="space-y-2">
        <Label htmlFor="compare-before">Earlier assessment</Label>
        <Select value={beforeId} onValueChange={(value) => go("a", value)}>
          <SelectTrigger id="compare-before">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {assessments.map((assessment) => (
              <SelectItem key={assessment.id} value={assessment.id}>
                {assessment.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="compare-after">Later assessment</Label>
        <Select value={afterId} onValueChange={(value) => go("b", value)}>
          <SelectTrigger id="compare-after">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {assessments.map((assessment) => (
              <SelectItem key={assessment.id} value={assessment.id}>
                {assessment.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
