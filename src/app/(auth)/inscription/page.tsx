import { AuthForm } from "@/components/auth-form";

export const metadata = { title: "Inscription" };

export default function SignupPage() {
  return (
    <>
      <h1 className="page-title mb-2">Crée ton espace</h1>
      <p className="mb-6 text-sm text-muted">Un espace par entreprise : stock, clients, devis et factures au même endroit.</p>
      <AuthForm mode="signup" />
    </>
  );
}
