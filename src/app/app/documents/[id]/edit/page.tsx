import { notFound, redirect } from "next/navigation";
import { DocumentForm } from "@/components/document-form";
import { requireSession } from "@/lib/auth";
import { getStockOverview } from "@/lib/stock";
import { isDocEditable, typeLabel } from "@/lib/format";
import { getDocument, listClients } from "@/lib/queries";

export const metadata = { title: "Edit document" };

export default async function EditDocumentPage({ params }: { params: Promise<{ id: string }> }) {
  const { org } = await requireSession();
  const data = await getDocument(org.id, (await params).id);
  if (!data) notFound();
  const { doc, items } = data;
  if (!isDocEditable(doc)) redirect(`/app/documents/${doc.id}`);
  const [clients, products] = await Promise.all([listClients(org.id), getStockOverview(org.id)]);

  return (
    <div className="space-y-6">
      <h1 className="page-title">
        {typeLabel(doc.type)} {doc.number}
      </h1>
      <DocumentForm
        clients={clients}
        catalog={products.filter((p) => !p.archived).map((p) => ({ ...p, stock: p.available }))}
        currency={org.currency}
        values={{
          id: doc.id,
          type: doc.type,
          clientId: doc.clientId,
          issueDate: doc.issueDate,
          dueDate: doc.dueDate ?? "",
          taxRate: doc.taxRate,
          notes: doc.notes,
          items: items.map((i) => ({
            productId: i.productId,
            description: i.description,
            quantity: i.quantity,
            unitPrice: i.unitPrice,
          })),
        }}
      />
    </div>
  );
}
