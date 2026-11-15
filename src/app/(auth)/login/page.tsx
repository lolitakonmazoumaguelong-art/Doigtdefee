import { AuthForm } from "@/components/auth-form";

export const metadata = { title: "Log in" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ reset?: string }> }) {
  const reset = (await searchParams).reset;
  return (
    <>
      <h1 className="page-title mb-6">Welcome back</h1>
      {reset && (
        <p role="status" className="mb-4 rounded-lg border border-moss/30 bg-moss/10 px-3 py-2 text-sm text-moss">
          Password changed. Log in with your new password.
        </p>
      )}
      <AuthForm mode="login" />
    </>
  );
}
