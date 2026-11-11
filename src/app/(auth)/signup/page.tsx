import { AuthForm } from "@/components/auth-form";

export const metadata = { title: "Sign up" };

export default function SignupPage() {
  return (
    <>
      <h1 className="page-title mb-2">Create your workspace</h1>
      <p className="mb-6 text-sm text-muted">One workspace per company: stock, clients, quotes and invoices in one place.</p>
      <AuthForm mode="signup" />
    </>
  );
}
