import Link from "next/link";
import type { Metadata } from "next";

import { AuthForm } from "@/components/auth/auth-form";
import { requestPasswordReset } from "@/lib/actions/auth";

export const metadata: Metadata = { title: "Reset your password" };

export default function ForgotPasswordPage() {
  return (
    <div className="surface-raised p-7 sm:p-9">
      <h1 className="text-2xl font-semibold tracking-[-0.02em]">Reset your password</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Enter your email and we will send you a link to set a new one.
      </p>

      <div className="mt-7">
        <AuthForm
          action={requestPasswordReset}
          submitLabel="Send reset link"
          pendingLabel="Sending"
          fields={[
            {
              name: "email",
              label: "Email",
              type: "email",
              autoComplete: "email",
              placeholder: "you@example.com",
            },
          ]}
          footer={
            <p className="text-center text-sm text-muted-foreground">
              <Link href="/login" className="underline underline-offset-4 hover:text-foreground">
                Back to sign in
              </Link>
            </p>
          }
        />
      </div>
    </div>
  );
}
