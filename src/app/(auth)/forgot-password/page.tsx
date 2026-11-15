import Link from "next/link";
import { emailRecoveryEnabled } from "@/actions/auth";
import { ForgotPasswordForm } from "@/components/reset-forms";

export const metadata = { title: "Forgot password" };

export default async function ForgotPasswordPage() {
  const enabled = await emailRecoveryEnabled();
  return (
    <>
      <h1 className="page-title mb-2">Forgot your password?</h1>
      {enabled ? (
        <>
          <p className="mb-6 text-sm text-muted">Enter your email and we will send you a link to choose a new one.</p>
          <ForgotPasswordForm />
        </>
      ) : (
        <>
          <p className="mb-4 text-sm text-muted">
            Email recovery is not switched on yet. If you are an employee, ask your company owner: they can set a new password for you in Settings, under Team.
          </p>
          <Link href="/login" className="btn btn-ghost w-full">
            Back to log in
          </Link>
        </>
      )}
    </>
  );
}
