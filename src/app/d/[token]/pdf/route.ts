import { pdfResponse, renderDocumentPdf } from "@/lib/pdf";
import { getSharedDocument } from "@/lib/queries";

// PDF public : accessible au client final via le lien de partage
export async function GET(_request: Request, { params }: { params: Promise<{ token: string }> }) {
  const data = await getSharedDocument((await params).token);
  if (!data) return new Response("Not found.", { status: 404 });
  return pdfResponse(await renderDocumentPdf(data), data.doc.number);
}
