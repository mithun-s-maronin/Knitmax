import Link from "next/link";
import type { Metadata } from "next";

import { AuthForm } from "@/components/auth/auth-form";
import { signUp } from "@/lib/actions/auth";

export const metadata: Metadata = { title: "Create your account" };

export default function SignupPage() {
  return (
    <div className="surface-raised p-7 sm:p-9">
      <h1 className="text-2xl font-semibold tracking-[-0.02em]">Create your account</h1>
      <p className="mt-2 text-sm text-muted-foreground text-pretty">
        Five minutes to your Financial Health Score. Everything you enter is
        yours alone, and you can export or delete it whenever you like.
      </p>

      <div className="mt-7">
        <AuthForm
          action={signUp}
          submitLabel="Create account"
          pendingLabel="Creating your account"
          fields={[
            {
              name: "fullName",
              label: "Your name",
              type: "text",
              autoComplete: "name",
              placeholder: "Alex Morgan",
            },
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
              autoComplete: "new-password",
              help: "At least 8 characters.",
            },
          ]}
          footer={
            <p className="text-center text-sm text-muted-foreground">
              Already have an account?{" "}
              <Link href="/login" className="font-medium text-foreground underline underline-offset-4">
                Sign in
              </Link>
            </p>
          }
        />
      </div>
    </div>
  );
}
