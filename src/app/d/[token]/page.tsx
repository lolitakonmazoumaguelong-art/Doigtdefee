import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { DocumentSheet } from "@/components/document-sheet";
import { PrintButton } from "@/components/ui";
import { getSharedDocument } from "@/lib/queries";

// Page publique : le client final consulte son devis ou sa facture sans compte.
export const metadata: Metadata = { title: "Document", robots: { index: false, follow: false } };

export default async function SharedDocumentPage({ params }: { params: Promise<{ token: string }> }) {
  const data = await getSharedDocument((await params).token);
  if (!data) notFound();

  return (
    <main className="flex-1 px-4 py-8 print:p-0">
      <div className="mx-auto mb-4 flex max-w-3xl items-center justify-between gap-4 print:hidden">
        <p className="text-sm text-muted">Document envoyé par {data.org.name}</p>
        <PrintButton label="Télécharger en PDF" />
      </div>
      <DocumentSheet {...data} />
    </main>
  );
}
