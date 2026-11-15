import { getSession } from "@/lib/auth";
import { pdfResponse, renderDocumentPdf } from "@/lib/pdf";
import { getDocument } from "@/lib/queries";

// Téléchargement du devis ou de la facture en vrai fichier PDF
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return new Response("Please log in.", { status: 401 });
  const data = await getDocument(session.org.id, (await params).id);
  if (!data) return new Response("Not found.", { status: 404 });
  return pdfResponse(await renderDocumentPdf({ org: session.org, ...data }), data.doc.number);
}
