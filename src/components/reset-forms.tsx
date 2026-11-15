"use client";

import Link from "next/link";
import { useActionState } from "react";
import { requestPasswordReset, resetPassword } from "@/actions/auth";
import { FormError } from "@/components/ui";

export function ForgotPasswordForm() {
  const [state, action, pending] = useActionState(requestPasswordReset, undefined);
  if (state?.ok) {
    return (
      <p role="status" className="rounded-lg border border-moss/30 bg-moss/10 px-3 py-2 text-sm text-moss">
        {state.message}
      </p>
    );
  }
  return (
    <form action={action} className="space-y-4">
      <div>
        <label className="label" htmlFor="email">
          Email
        </label>
        <input id="email" name="email" type="email" className="input" autoComplete="email" required />
      </div>
      <FormError message={state?.error} />
      <button className="btn btn-primary w-full py-2.5" disabled={pending}>
        {pending ? "Sending..." : "Send me a reset link"}
      </button>
      <p className="text-center text-sm">
        <Link href="/login" className="text-muted underline underline-offset-4 hover:text-ink">
          Back to log in
        </Link>
      </p>
    </form>
  );
}

export function ResetPasswordForm({ token }: { token: string }) {
  const [state, action, pending] = useActionState(resetPassword, undefined);
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="token" value={token} />
      <div>
        <label className="label" htmlFor="password">
          New password
        </label>
        <input id="password" name="password" type="password" className="input" autoComplete="new-password" minLength={8} required />
        <p className="mt-1.5 text-xs text-muted">At least 8 characters.</p>
      </div>
      <FormError message={state?.error} />
      <button className="btn btn-primary w-full py-2.5" disabled={pending}>
        {pending ? "Saving..." : "Save my new password"}
      </button>
    </form>
  );
}
