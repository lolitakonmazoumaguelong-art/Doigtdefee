import { AuthForm } from "@/components/auth-form";

export const metadata = { title: "Log in" };

export default function LoginPage() {
  return (
    <>
      <h1 className="page-title mb-6">Welcome back</h1>
      <AuthForm mode="login" />
    </>
  );
}
