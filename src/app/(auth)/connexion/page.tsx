import { AuthForm } from "@/components/auth-form";

export const metadata = { title: "Connexion" };

export default function LoginPage() {
  return (
    <>
      <h1 className="page-title mb-6">Content de te revoir</h1>
      <AuthForm mode="login" />
    </>
  );
}
