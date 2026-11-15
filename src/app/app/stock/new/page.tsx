import Link from "next/link";
import { ProductForm } from "@/components/product-form";
import { requireSession } from "@/lib/auth";
import { listProducts } from "@/lib/queries";

export const metadata = { title: "New item" };

export default async function NewProductPage({ searchParams }: { searchParams: Promise<{ added?: string; n?: string }> }) {
  const { org } = await requireSession();
  const { added, n } = await searchParams;
  const suppliers = [...new Set((await listProducts(org.id)).map((p) => p.supplier).filter(Boolean))];
  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="page-title">New item</h1>
        <Link href="/app/stock/import" className="btn btn-ghost">
          Import a list instead
        </Link>
      </header>
      {added && (
        <p role="status" className="max-w-xl rounded-lg border border-moss/30 bg-moss/10 px-3 py-2 text-sm text-moss">
          “{added}” added. Enter the next one.
        </p>
      )}
      {/* La clé change à chaque ajout : le formulaire repart vide */}
      <ProductForm key={n ?? "first"} currency={org.currency} suppliers={suppliers} />
    </div>
  );
}
