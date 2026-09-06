import Link from "next/link";
import type { Metadata } from "next";

import { AuthForm } from "@/components/auth/auth-form";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { signIn } from "@/lib/actions/auth";

export const metadata: Metadata = { title: "Sign in" };

const ERRORS: Record<string, string> = {
  link_expired: "That link has expired or has already been used. Try again below.",
  not_configured:
    "Meridian is not connected to a Supabase project yet. See the README for setup.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const params = await searchParams;
  const next = params.next?.startsWith("/") ? params.next : "/dashboard";
  const notice = params.error ? ERRORS[params.error] : undefined;

  return (
    <div className="surface-raised p-7 sm:p-9">
      <h1 className="text-2xl font-semibold tracking-[-0.02em]">Welcome back</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Sign in to pick up where you left off.
      </p>

      {notice ? (
        <Alert variant="warning" className="mt-5">
          <AlertDescription>{notice}</AlertDescription>
        </Alert>
      ) : null}

      <div className="mt-7">
        <AuthForm
          action={signIn}
          hidden={{ next }}
          submitLabel="Sign in"
          pendingLabel="Signing in"
          fields={[
            {
              name: "email",
              label: "Email",
              type: "email",
              autoComplete: "email",
              placeholder: "you@example.com",
            },
            {
              name: "password",
              label: "Password",
              type: "password",
              autoComplete: "current-password",
            },
          ]}
          footer={
            <div className="flex flex-col gap-2 text-center text-sm">
              <Link
                href="/forgot-password"
                className="rounded text-muted-foreground underline underline-offset-4 hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              >
                Forgot your password?
              </Link>
              <p className="text-muted-foreground">
                New here?{" "}
                <Link href="/signup" className="font-medium text-foreground underline underline-offset-4">
                  Create an account
                </Link>
              </p>
            </div>
          }
        />
      </div>
    </div>
  );
}
