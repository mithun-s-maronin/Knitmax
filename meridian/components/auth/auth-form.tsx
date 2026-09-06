"use client";

import * as React from "react";
import { useActionState } from "react";
import { AlertCircle, CheckCircle2 } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { AuthFormState } from "@/lib/actions/auth";

export interface AuthFieldSpec {
  name: string;
  label: string;
  type: string;
  autoComplete?: string;
  placeholder?: string;
  help?: string;
}

/**
 * The shared shell for every auth form.
 *
 * Errors are announced through a live region and each field is wired to its
 * own message with aria-describedby, so a failure is not something you have to
 * see to know about.
 */
export function AuthForm({
  action,
  fields,
  submitLabel,
  pendingLabel,
  hidden,
  footer,
}: {
  action: (state: AuthFormState, formData: FormData) => Promise<AuthFormState>;
  fields: AuthFieldSpec[];
  submitLabel: string;
  pendingLabel: string;
  hidden?: Record<string, string>;
  footer?: React.ReactNode;
}) {
  const [state, formAction, pending] = useActionState<AuthFormState, FormData>(action, {});

  return (
    <form action={formAction} className="space-y-5" noValidate>
      {hidden
        ? Object.entries(hidden).map(([name, value]) => (
            <input key={name} type="hidden" name={name} value={value} />
          ))
        : null}

      <div aria-live="polite" className="space-y-3 empty:hidden">
        {state.error ? (
          <Alert variant="destructive">
            <AlertCircle />
            <AlertTitle>That did not work</AlertTitle>
            <AlertDescription>{state.error}</AlertDescription>
          </Alert>
        ) : null}
        {state.message ? (
          <Alert variant="success">
            <CheckCircle2 />
            <AlertTitle>Check your inbox</AlertTitle>
            <AlertDescription>{state.message}</AlertDescription>
          </Alert>
        ) : null}
      </div>

      {fields.map((field) => {
        const error = state.fieldErrors?.[field.name];
        const describedBy =
          [error ? `${field.name}-error` : null, field.help ? `${field.name}-help` : null]
            .filter(Boolean)
            .join(" ") || undefined;

        return (
          <div key={field.name} className="space-y-2">
            <Label htmlFor={field.name}>{field.label}</Label>
            <Input
              id={field.name}
              name={field.name}
              type={field.type}
              autoComplete={field.autoComplete}
              placeholder={field.placeholder}
              aria-invalid={error ? true : undefined}
              aria-describedby={describedBy}
            />
            {field.help ? (
              <p id={`${field.name}-help`} className="text-xs text-muted-foreground">
                {field.help}
              </p>
            ) : null}
            {error ? (
              <p id={`${field.name}-error`} className="text-xs text-destructive-ink">
                {error}
              </p>
            ) : null}
          </div>
        );
      })}

      <Button type="submit" className="w-full" size="lg" loading={pending}>
        {pending ? pendingLabel : submitLabel}
      </Button>

      {footer}
    </form>
  );
}
