import { redirect } from "next/navigation";
import { Logo } from "@/components/ui";
import { getSession } from "@/lib/auth";

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  if (await getSession()) redirect("/app");

  return (
    <div className="flex flex-1 flex-col items-center justify-center px-4 py-12">
      <Logo />
      <div className="card mt-8 w-full max-w-sm p-6 sm:p-8">{children}</div>
    </div>
  );
}
