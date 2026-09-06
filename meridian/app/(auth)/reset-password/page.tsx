import type { Metadata } from "next";

import { AuthForm } from "@/components/auth/auth-form";
import { updatePassword } from "@/lib/actions/auth";

export const metadata: Metadata = { title: "Choose a new password" };

export default function ResetPasswordPage() {
  return (
    <div className="surface-raised p-7 sm:p-9">
      <h1 className="text-2xl font-semibold tracking-[-0.02em]">Choose a new password</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        You are signed in from the link in your email. Set a new password to finish.
      </p>

      <div className="mt-7">
        <AuthForm
          action={updatePassword}
          submitLabel="Save new password"
          pendingLabel="Saving"
          fields={[
            {
              name: "password",
              label: "New password",
              type: "password",
              autoComplete: "new-password",
              help: "At least 8 characters.",
            },
            {
              name: "confirmPassword",
              label: "Confirm new password",
              type: "password",
              autoComplete: "new-password",
            },
          ]}
        />
      </div>
    </div>
  );
}
