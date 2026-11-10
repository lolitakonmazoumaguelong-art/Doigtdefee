import { ClientForm } from "@/components/client-form";

export const metadata = { title: "Nouveau client" };

export default function NewClientPage() {
  return (
    <div className="space-y-6">
      <h1 className="page-title">Nouveau client</h1>
      <ClientForm />
    </div>
  );
}
