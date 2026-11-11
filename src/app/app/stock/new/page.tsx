import { ProductForm } from "@/components/product-form";
import { requireSession } from "@/lib/auth";
import { listProducts } from "@/lib/queries";

export const metadata = { title: "New item" };

export default async function NewProductPage() {
  const { org } = await requireSession();
  const suppliers = [...new Set((await listProducts(org.id)).map((p) => p.supplier).filter(Boolean))];
  return (
    <div className="space-y-6">
      <h1 className="page-title">New item</h1>
      <ProductForm currency={org.currency} suppliers={suppliers} />
    </div>
  );
}
