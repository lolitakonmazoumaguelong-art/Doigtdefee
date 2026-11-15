import { ResetPasswordForm } from "@/components/reset-forms";

export const metadata = { title: "Choose a new password", robots: { index: false } };

export default async function ResetPasswordPage({ params }: { params: Promise<{ token: string }> }) {
  return (
    <>
      <h1 className="page-title mb-6">Choose a new password</h1>
      <ResetPasswordForm token={(await params).token} />
    </>
  );
}
