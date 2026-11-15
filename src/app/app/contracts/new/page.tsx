import { notFound } from "next/navigation";
import { ContractForm } from "@/components/contract-form";
import { requireSession } from "@/lib/auth";
import { today } from "@/lib/format";
import { getClient } from "@/lib/queries";

export const metadata = { title: "New maintenance contract" };

export default async function NewContractPage({ searchParams }: { searchParams: Promise<{ client?: string }> }) {
  const { org } = await requireSession();
  const client = await getClient(org.id, (await searchParams).client ?? "");
  if (!client) notFound();
  return (
    <div className="space-y-6">
      <h1 className="page-title">New maintenance contract</h1>
      <ContractForm
        clientName={client.name}
        currency={org.currency}
        values={{ clientId: client.id, title: "", startDate: today(), endDate: "", nextVisit: "", intervalMonths: 6, price: 0, notes: "", status: "actif" }}
      />
    </div>
  );
}
