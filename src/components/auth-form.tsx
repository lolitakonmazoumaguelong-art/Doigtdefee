"use client";

import Link from "next/link";
import { login, signup } from "@/actions/auth";
import { useFormAction } from "@/components/use-form-action";
import { FormError, SubmitButton } from "@/components/ui";
import { CURRENCIES } from "@/lib/format";

export function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const isSignup = mode === "signup";
  const { state, pending, formProps } = useFormAction(isSignup ? signup : login);

  return (
    <form {...formProps} className="space-y-4">
      {isSignup && (
        <>
          <div>
            <label className="label" htmlFor="company">
              Company name
            </label>
            <input id="company" name="company" className="input" autoComplete="organization" required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label" htmlFor="name">
                Your name
              </label>
              <input id="name" name="name" className="input" autoComplete="name" required />
            </div>
            <div>
              <label className="label" htmlFor="currency">
                Currency
              </label>
              <select id="currency" name="currency" className="input" defaultValue="MUR">
                {CURRENCIES.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.code}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </>
      )}
      <div>
        <label className="label" htmlFor="email">
          Email
        </label>
        <input id="email" name="email" type="email" className="input" autoComplete="email" required />
      </div>
      <div>
        <label className="label" htmlFor="password">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          className="input"
          minLength={isSignup ? 8 : undefined}
          autoComplete={isSignup ? "new-password" : "current-password"}
          required
        />
        {isSignup && <p className="mt-1.5 text-xs text-muted">At least 8 characters.</p>}
      </div>
      <FormError message={state?.error} />
      <SubmitButton pending={pending} className="btn btn-primary w-full py-2.5">
        {isSignup ? "Create my account" : "Log in"}
      </SubmitButton>
      {!isSignup && (
        <p className="text-center text-xs text-muted">
          Forgot your password? Your company owner can set a new one for you from their settings.
        </p>
      )}
      <p className="text-center text-sm text-muted">
        {isSignup ? "Already have an account? " : "No account yet? "}
        <Link href={isSignup ? "/login" : "/signup"} className="font-medium text-ink underline underline-offset-4">
          {isSignup ? "Log in" : "Sign up free"}
        </Link>
      </p>
    </form>
  );
}
