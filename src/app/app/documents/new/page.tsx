import Link from "next/link";
import { DocumentForm } from "@/components/document-form";
import { requireSession } from "@/lib/auth";
import { getStockOverview } from "@/lib/stock";
import { addDays, today } from "@/lib/format";
import { listClients } from "@/lib/queries";

export const metadata = { title: "New document" };

export default async function NewDocumentPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string; client?: string }>;
}) {
  const { org } = await requireSession();
  const params = await searchParams;
  const type = params.type === "facture" ? "facture" : "devis";
  const [clients, products] = await Promise.all([listClients(org.id), getStockOverview(org.id)]);
  const issueDate = today();

  return (
    <div className="space-y-6">
      <h1 className="page-title">{type === "devis" ? "New quote" : "New invoice"}</h1>
      {clients.length === 0 ? (
        <div className="card max-w-xl p-6">
          <p className="text-sm">You need a client before creating a document.</p>
          <Link href="/app/clients/new" className="btn btn-primary mt-4">
            Add a client
          </Link>
        </div>
      ) : (
        <DocumentForm
          clients={clients}
          catalog={products.filter((p) => !p.archived).map((p) => ({ ...p, stock: p.available }))}
          currency={org.currency}
          values={{
            type,
            clientId: clients.some((c) => c.id === params.client) ? params.client! : "",
            issueDate,
            dueDate: addDays(issueDate, 30),
            taxRate: org.taxRate,
            notes: "",
            items: [],
          }}
        />
      )}
    </div>
  );
}
