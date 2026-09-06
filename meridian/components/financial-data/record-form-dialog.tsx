"use client";

import * as React from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { CurrencyInput } from "@/components/assessment/currency-input";
import { saveRecord } from "@/lib/actions/records";
import type { EntityConfig, FieldSpec } from "@/lib/financial-data/config";
import { cn } from "@/lib/utils";

type Values = Record<string, unknown>;

/**
 * The add/edit dialog, driven entirely by the entity's field spec.
 *
 * One dialog serves all seven record types, so a field added to a config
 * appears in the form, the table and the validation schema without a new
 * component. Errors come back from the server keyed by field name and are
 * shown inline, wired with aria-describedby.
 */
export function RecordFormDialog({
  config,
  currency,
  open,
  onOpenChange,
  record,
}: {
  config: EntityConfig;
  currency: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Present when editing; absent when adding. */
  record?: Values | null;
}) {
  const editing = Boolean(record?.id);

  const initial = React.useMemo<Values>(() => {
    if (!record) return { ...config.defaults };
    const next: Values = {};
    for (const field of config.fields) {
      const value = record[field.name];
      next[field.name] =
        value === null || value === undefined
          ? (config.defaults[field.name] ?? "")
          : field.type === "select"
            ? String(value)
            : value;
    }
    return next;
  }, [record, config]);

  const [values, setValues] = React.useState<Values>(initial);
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [pending, startTransition] = React.useTransition();

  // Reset when the dialog is pointed at a different record.
  const [lastInitial, setLastInitial] = React.useState(initial);
  if (initial !== lastInitial) {
    setLastInitial(initial);
    setValues(initial);
    setErrors({});
  }

  const update = (name: string, value: unknown) => {
    setValues((current) => ({ ...current, [name]: value }));
    setErrors((current) => {
      if (!current[name]) return current;
      const next = { ...current };
      delete next[name];
      return next;
    });
  };

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    setErrors({});

    startTransition(async () => {
      const payload: Values = { ...values };
      // Empty optional fields go as undefined, not "", so the schema's
      // optional() branches apply rather than failing a type check.
      for (const [key, value] of Object.entries(payload)) {
        if (value === "") delete payload[key];
      }

      const result = await saveRecord({
        table: config.table,
        id: editing ? String(record?.id) : null,
        values: payload,
      });

      if (!result.ok) {
        setErrors(result.fieldErrors ?? {});
        if (!result.fieldErrors) toast.error(result.error ?? "That did not save.");
        return;
      }

      toast.success(
        editing ? `${config.singular} updated.` : `${config.singular} added.`,
      );
      onOpenChange(false);
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {editing ? `Edit ${config.singular}` : `Add ${config.singular}`}
          </DialogTitle>
          <DialogDescription>{config.description}</DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} className="space-y-4" noValidate>
          <div className="grid gap-4 sm:grid-cols-2">
            {config.fields.map((field) => (
              <FieldControl
                key={field.name}
                field={field}
                value={values[field.name]}
                currency={currency}
                error={errors[field.name]}
                onChange={(value) => update(field.name, value)}
              />
            ))}
          </div>

          {errors.form ? (
            <p role="alert" className="text-sm text-destructive">
              {errors.form}
            </p>
          ) : null}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={pending}
            >
              Cancel
            </Button>
            <Button type="submit" loading={pending}>
              {editing ? "Save changes" : `Add ${config.singular}`}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function FieldControl({
  field,
  value,
  currency,
  error,
  onChange,
}: {
  field: FieldSpec;
  value: unknown;
  currency: string;
  error?: string;
  onChange: (value: unknown) => void;
}) {
  const errorId = `${field.name}-error`;
  const helpId = `${field.name}-help`;
  const describedBy =
    [field.help ? helpId : null, error ? errorId : null].filter(Boolean).join(" ") ||
    undefined;

  const wrapper = cn("space-y-2", field.half ? "sm:col-span-1" : "sm:col-span-2");

  if (field.type === "switch") {
    return (
      <div className={cn(wrapper, "sm:col-span-2")}>
        <label className="flex cursor-pointer items-start gap-3 rounded-xl border p-3.5 transition-colors hover:bg-accent/50 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-ring">
          <Checkbox
            checked={value === true}
            onCheckedChange={(next) => onChange(next === true)}
            aria-describedby={describedBy}
            className="mt-0.5"
          />
          <span className="min-w-0">
            <span className="block text-sm font-medium">{field.label}</span>
            {field.help ? (
              <span id={helpId} className="mt-0.5 block text-xs text-muted-foreground">
                {field.help}
              </span>
            ) : null}
          </span>
        </label>
      </div>
    );
  }

  return (
    <div className={wrapper}>
      <Label htmlFor={field.name}>{field.label}</Label>

      {field.type === "currency" ? (
        <CurrencyInput
          id={field.name}
          value={typeof value === "number" || typeof value === "string" ? value : null}
          currency={currency}
          invalid={Boolean(error)}
          describedBy={describedBy}
          onChange={(next) => onChange(next === null ? "" : next)}
        />
      ) : null}

      {field.type === "percent" ? (
        <div className="relative">
          <Input
            id={field.name}
            type="text"
            inputMode="decimal"
            className="pr-8 tabular"
            value={value === null || value === undefined ? "" : String(value)}
            placeholder={field.placeholder}
            aria-invalid={Boolean(error) || undefined}
            aria-describedby={describedBy}
            onChange={(event) =>
              onChange(event.target.value.replace(/[^0-9.]/g, ""))
            }
          />
          <span
            aria-hidden
            className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground"
          >
            %
          </span>
        </div>
      ) : null}

      {field.type === "text" || field.type === "number" || field.type === "date" ? (
        <Input
          id={field.name}
          type={field.type === "text" ? "text" : field.type}
          inputMode={field.type === "number" ? "numeric" : undefined}
          value={value === null || value === undefined ? "" : String(value)}
          placeholder={field.placeholder}
          aria-invalid={Boolean(error) || undefined}
          aria-describedby={describedBy}
          onChange={(event) => onChange(event.target.value)}
        />
      ) : null}

      {field.type === "textarea" ? (
        <Textarea
          id={field.name}
          value={value === null || value === undefined ? "" : String(value)}
          placeholder={field.placeholder}
          aria-invalid={Boolean(error) || undefined}
          aria-describedby={describedBy}
          onChange={(event) => onChange(event.target.value)}
        />
      ) : null}

      {field.type === "select" ? (
        <Select
          value={value === null || value === undefined ? undefined : String(value)}
          onValueChange={(next) => onChange(next)}
        >
          <SelectTrigger
            id={field.name}
            aria-invalid={Boolean(error) || undefined}
            aria-describedby={describedBy}
          >
            <SelectValue placeholder="Choose one" />
          </SelectTrigger>
          <SelectContent>
            {field.options?.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : null}

      {field.help ? (
        <p id={helpId} className="text-xs text-muted-foreground">
          {field.help}
        </p>
      ) : null}

      {error ? (
        <p id={errorId} className="text-xs text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}
