import Link from "next/link";
import { ImportForm } from "@/components/import-form";
import { requireSession } from "@/lib/auth";

export const metadata = { title: "Import items" };

export default async function ImportPage() {
  await requireSession();
  return (
    <div className="space-y-6">
      <header>
        <Link href="/app/stock" className="text-sm text-muted underline-offset-4 hover:underline">
          Stock
        </Link>
        <h1 className="page-title mt-1">Import your catalogue</h1>
        <p className="mt-2 text-sm text-muted">Add hundreds of items in one go from a spreadsheet.</p>
      </header>
      <ImportForm />
    </div>
  );
}
