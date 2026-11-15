import { notFound } from "next/navigation";
import { ContractForm } from "@/components/contract-form";
import { requireSession } from "@/lib/auth";
import { getClient, getContract } from "@/lib/queries";

export const metadata = { title: "Maintenance contract" };

export default async function ContractPage({ params }: { params: Promise<{ id: string }> }) {
  const { org, user } = await requireSession();
  const contract = await getContract(org.id, (await params).id);
  if (!contract) notFound();
  const client = await getClient(org.id, contract.clientId);
  return (
    <div className="space-y-6">
      <h1 className="page-title">Maintenance contract</h1>
      <ContractForm
        canDelete={user.role === "owner"}
        clientName={client?.name ?? ""}
        currency={org.currency}
        values={{
          id: contract.id,
          clientId: contract.clientId,
          title: contract.title,
          startDate: contract.startDate,
          endDate: contract.endDate ?? "",
          nextVisit: contract.nextVisit ?? "",
          intervalMonths: contract.intervalMonths,
          price: contract.price,
          notes: contract.notes,
          status: contract.status,
        }}
      />
    </div>
  );
}
