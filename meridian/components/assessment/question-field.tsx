"use client";

import * as React from "react";

import { cn } from "@/lib/utils";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { AnswerValue, Question } from "@/lib/assessment/questions";

import { CurrencyInput } from "./currency-input";
import { LearnMore } from "./learn-more";

/** Renders one question of any type, wired for keyboard and screen readers. */
export function QuestionField({
  question,
  value,
  currency,
  error,
  onChange,
}: {
  question: Question;
  value: AnswerValue;
  currency: string;
  error?: string;
  onChange: (value: AnswerValue) => void;
}) {
  const errorId = `${question.id}-error`;
  const helpId = `${question.id}-help`;
  const describedBy =
    [question.help ? helpId : null, error ? errorId : null].filter(Boolean).join(" ") ||
    undefined;

  const labelledById = `${question.id}-label`;

  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        {question.type === "radio" || question.type === "multiselect" ? (
          <p id={labelledById} className="text-base font-medium leading-snug text-pretty">
            {question.label}
          </p>
        ) : (
          <Label
            htmlFor={question.id}
            className="text-base font-medium leading-snug text-pretty"
          >
            {question.label}
          </Label>
        )}

        {question.help ? (
          <p id={helpId} className="text-sm text-muted-foreground text-pretty">
            {question.help}
          </p>
        ) : null}

        {question.learnMore ? (
          <LearnMore title={question.learnMore.title} body={question.learnMore.body} />
        ) : null}
      </div>

      {question.type === "currency" ? (
        <CurrencyInput
          id={question.id}
          value={typeof value === "number" || typeof value === "string" ? value : null}
          currency={currency}
          invalid={Boolean(error)}
          describedBy={describedBy}
          onChange={(next) => onChange(next)}
        />
      ) : null}

      {question.type === "number" ? (
        <Input
          id={question.id}
          type="number"
          inputMode="numeric"
          min={question.min}
          max={question.max}
          className="h-12 max-w-40 text-lg tabular"
          value={value === null || value === undefined ? "" : String(value)}
          aria-invalid={Boolean(error) || undefined}
          aria-describedby={describedBy}
          onChange={(event) =>
            onChange(event.target.value === "" ? null : Number(event.target.value))
          }
        />
      ) : null}

      {question.type === "select" ? (
        <Select
          value={typeof value === "string" ? value : undefined}
          onValueChange={(next) => onChange(next)}
        >
          <SelectTrigger
            id={question.id}
            className="h-12 max-w-md"
            aria-invalid={Boolean(error) || undefined}
            aria-describedby={describedBy}
          >
            <SelectValue placeholder="Choose one" />
          </SelectTrigger>
          <SelectContent>
            {question.options?.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : null}

      {question.type === "radio" ? (
        <RadioGroup
          value={typeof value === "string" ? value : undefined}
          onValueChange={(next) => onChange(next)}
          aria-labelledby={labelledById}
          aria-describedby={describedBy}
          className="gap-2"
        >
          {question.options?.map((option) => {
            const id = `${question.id}-${option.value}`;
            const selected = value === option.value;
            return (
              <label
                key={option.value}
                htmlFor={id}
                className={cn(
                  "flex cursor-pointer items-start gap-3 rounded-xl border p-3.5 transition-colors",
                  "hover:bg-accent/60 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-ring",
                  selected && "border-primary/50 bg-primary/[0.06]",
                )}
              >
                <RadioGroupItem id={id} value={option.value} className="mt-0.5" />
                <span className="min-w-0">
                  <span className="block text-sm font-medium">{option.label}</span>
                  {option.description ? (
                    <span className="mt-0.5 block text-sm text-muted-foreground text-pretty">
                      {option.description}
                    </span>
                  ) : null}
                </span>
              </label>
            );
          })}
        </RadioGroup>
      ) : null}

      {question.type === "multiselect" ? (
        <div
          role="group"
          aria-labelledby={labelledById}
          aria-describedby={describedBy}
          className="grid gap-2 sm:grid-cols-2"
        >
          {question.options?.map((option) => {
            const id = `${question.id}-${option.value}`;
            const current = Array.isArray(value) ? value : [];
            const checked = current.includes(option.value);
            return (
              <label
                key={option.value}
                htmlFor={id}
                className={cn(
                  "flex cursor-pointer items-center gap-3 rounded-xl border p-3.5 transition-colors",
                  "hover:bg-accent/60 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-ring",
                  checked && "border-primary/50 bg-primary/[0.06]",
                )}
              >
                <Checkbox
                  id={id}
                  checked={checked}
                  onCheckedChange={(next) =>
                    onChange(
                      next
                        ? [...current, option.value]
                        : current.filter((v) => v !== option.value),
                    )
                  }
                />
                <span className="text-sm font-medium">{option.label}</span>
              </label>
            );
          })}
        </div>
      ) : null}

      {question.type === "boolean" ? (
        <RadioGroup
          value={value === true ? "yes" : value === false ? "no" : undefined}
          onValueChange={(next) => onChange(next === "yes")}
          aria-labelledby={labelledById}
          aria-describedby={describedBy}
          className="flex gap-2"
        >
          {[
            { value: "yes", label: "Yes" },
            { value: "no", label: "No" },
          ].map((option) => {
            const id = `${question.id}-${option.value}`;
            const selected =
              (option.value === "yes" && value === true) ||
              (option.value === "no" && value === false);
            return (
              <label
                key={option.value}
                htmlFor={id}
                className={cn(
                  "flex flex-1 cursor-pointer items-center gap-3 rounded-xl border p-3.5 transition-colors sm:flex-none sm:min-w-32",
                  "hover:bg-accent/60 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-ring",
                  selected && "border-primary/50 bg-primary/[0.06]",
                )}
              >
                <RadioGroupItem id={id} value={option.value} />
                <span className="text-sm font-medium">{option.label}</span>
              </label>
            );
          })}
        </RadioGroup>
      ) : null}

      {error ? (
        <p id={errorId} className="text-sm text-destructive-ink">
          {error}
        </p>
      ) : null}
    </div>
  );
}
