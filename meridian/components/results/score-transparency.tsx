import { Info } from "lucide-react";

import { cn } from "@/lib/utils";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import type { PillarResult } from "@/lib/scoring";

/**
 * "How your score was calculated" (§78).
 *
 * Every component's measured value, weight and points contributed, so a user
 * can add the numbers up themselves and arrive at the same answer.
 */
export function ScoreTransparency({
  pillars,
  overallScore,
  scoringVersion,
  measuredWeight,
  className,
}: {
  pillars: PillarResult[];
  overallScore: number;
  scoringVersion: string;
  measuredWeight: number;
  className?: string;
}) {
  const scored = pillars.filter((p) => p.score !== null);
  const renormalised = measuredWeight < 0.999;

  return (
    <section className={cn("surface p-6 sm:p-8", className)} aria-labelledby="transparency-heading">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id="transparency-heading" className="text-xl font-semibold tracking-[-0.015em]">
            How your score was calculated
          </h2>
          <p className="mt-1.5 text-sm text-muted-foreground text-pretty">
            Nothing here is hidden. These are the exact values measured, the
            weight each carried, and the points each contributed.
          </p>
        </div>
        <Badge variant="muted">Scoring {scoringVersion}</Badge>
      </div>

      {/* ---- The overall sum ---- */}
      <div className="mt-6 overflow-x-auto rounded-xl border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Pillar</TableHead>
              <TableHead className="text-right">Score</TableHead>
              <TableHead className="text-right">Weight</TableHead>
              <TableHead className="text-right">Contribution</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pillars.map((pillar) => (
              <TableRow key={pillar.key}>
                <TableCell className="font-medium">{pillar.label}</TableCell>
                <TableCell className="text-right tabular">
                  {pillar.score ?? "Not measured"}
                </TableCell>
                <TableCell className="text-right tabular text-muted-foreground">
                  {pillar.score === null
                    ? "—"
                    : `${(pillar.effectiveWeight * 100).toFixed(renormalised ? 1 : 0)}%`}
                </TableCell>
                <TableCell className="text-right tabular">
                  {pillar.score === null
                    ? "—"
                    : (pillar.score * pillar.effectiveWeight).toFixed(1)}
                </TableCell>
              </TableRow>
            ))}
            <TableRow className="bg-muted/40 font-semibold hover:bg-muted/40">
              <TableCell>Overall</TableCell>
              <TableCell className="text-right tabular">{overallScore}</TableCell>
              <TableCell className="text-right tabular">100%</TableCell>
              <TableCell className="text-right tabular">
                {scored
                  .reduce((sum, p) => sum + (p.score ?? 0) * p.effectiveWeight, 0)
                  .toFixed(1)}
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>

      {renormalised ? (
        <p className="mt-4 flex gap-2.5 rounded-lg bg-muted/50 p-3.5 text-sm text-muted-foreground text-pretty">
          <Info className="mt-0.5 size-4 shrink-0" />
          <span>
            One or more pillars could not be measured from what you told us, so
            they were left out and the remaining weights were scaled up to fill
            the gap. Nothing was scored as a zero because it was missing.
          </span>
        </p>
      ) : null}

      {/* ---- Each pillar's components ---- */}
      <Accordion type="multiple" className="mt-8">
        {pillars.map((pillar) => (
          <AccordionItem key={pillar.key} value={pillar.key}>
            <AccordionTrigger>
              <span className="flex items-baseline gap-3">
                <span>{pillar.label}</span>
                <span className="text-sm font-normal tabular text-muted-foreground">
                  {pillar.score ?? "—"} / 100
                </span>
              </span>
            </AccordionTrigger>
            <AccordionContent className="text-foreground">
              <div className="overflow-x-auto rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Component</TableHead>
                      <TableHead>Your value</TableHead>
                      <TableHead>Target</TableHead>
                      <TableHead className="text-right">Score</TableHead>
                      <TableHead className="text-right">Weight</TableHead>
                      <TableHead className="text-right">Points</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pillar.breakdown.map((component) => (
                      <TableRow key={component.key}>
                        <TableCell className="font-medium">{component.label}</TableCell>
                        <TableCell className="tabular">{component.metric.display}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {component.metric.target ?? "—"}
                        </TableCell>
                        <TableCell className="text-right tabular">
                          {component.score === null
                            ? "Not measured"
                            : Math.round(component.score)}
                        </TableCell>
                        <TableCell className="text-right tabular text-muted-foreground">
                          {component.status === "ok"
                            ? `${(component.effectiveWeight * 100).toFixed(0)}%`
                            : "—"}
                        </TableCell>
                        <TableCell className="text-right tabular">
                          {component.contribution === null
                            ? "—"
                            : component.contribution.toFixed(1)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>

      <div className="mt-8 rounded-xl bg-muted/40 p-5">
        <p className="text-sm font-medium">The formula</p>
        <pre className="mt-3 overflow-x-auto text-sm leading-relaxed tabular text-muted-foreground">
          <code>{`Overall = (Spend × 0.25) + (Save × 0.30) + (Borrow × 0.25) + (Plan × 0.20)`}</code>
        </pre>
        <p className="mt-3 text-sm text-muted-foreground text-pretty">
          Pillar scores are rounded before they are combined, so the four numbers
          above add up to your overall score exactly.
        </p>
      </div>
    </section>
  );
}
