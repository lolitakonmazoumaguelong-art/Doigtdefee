import { ClientForm } from "@/components/client-form";

export const metadata = { title: "New client" };

export default function NewClientPage() {
  return (
    <div className="space-y-6">
      <h1 className="page-title">New client</h1>
      <ClientForm />
    </div>
  );
}
