import { notFound } from "next/navigation";
import { ClientForm } from "@/components/client-form";
import { requireSession } from "@/lib/auth";
import { getClient } from "@/lib/queries";

export const metadata = { title: "Edit client" };

export default async function EditClientPage({ params }: { params: Promise<{ id: string }> }) {
  const { org } = await requireSession();
  const client = await getClient(org.id, (await params).id);
  if (!client) notFound();

  return (
    <div className="space-y-6">
      <h1 className="page-title">Edit {client.name}</h1>
      <ClientForm
        client={{
          id: client.id,
          name: client.name,
          kind: client.kind,
          email: client.email,
          phone: client.phone,
          address: client.address,
          notes: client.notes,
        }}
      />
    </div>
  );
}
