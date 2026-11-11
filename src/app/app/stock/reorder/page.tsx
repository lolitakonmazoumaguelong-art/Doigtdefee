import Link from "next/link";
import { cancelPurchaseOrder, createPurchaseOrder, receivePurchaseOrder } from "@/actions/purchases";
import { Badge, ConfirmButton } from "@/components/ui";
import { requireSession } from "@/lib/auth";
import { formatMoney } from "@/lib/format";
import { getStockOverview, listPurchaseOrders } from "@/lib/stock";

export const metadata = { title: "To order" };

const dateFormat = new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeZone: "Indian/Mauritius" });

export default async function ReorderPage() {
  const { org } = await requireSession();
  const [overview, orders] = await Promise.all([getStockOverview(org.id), listPurchaseOrders(org.id)]);
  const money = (cents: number) => formatMoney(cents, org.currency);

  const toOrder = overview.filter((p) => p.toOrder > 0);
  const suppliers = [...new Set(toOrder.map((p) => p.supplier))].sort((a, b) => (a === "" ? 1 : b === "" ? -1 : a.localeCompare(b)));
  const pending = orders.filter((o) => o.status === "commande");
  const history = orders.filter((o) => o.status !== "commande");

  return (
    <div className="space-y-8">
      <header>
        <Link href="/app/stock" className="text-sm text-muted underline-offset-4 hover:underline">
          Stock
        </Link>
        <h1 className="page-title mt-1">To order</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted">
          Calculated automatically from available stock (minus what is reserved for clients), orders already on the way and
          sales over the last 30 days.
        </p>
      </header>

      {toOrder.length === 0 ? (
        <div className="card p-8 text-center">
          <p className="font-display text-2xl">Nothing to order</p>
          <p className="mt-2 text-sm text-muted">All items are above their alert threshold.</p>
        </div>
      ) : (
        suppliers.map((supplier) => {
          const lines = toOrder.filter((p) => p.supplier === supplier);
          const total = lines.reduce((s, p) => s + p.toOrder * p.costPrice, 0);
          return (
            <form key={supplier || "sans"} action={createPurchaseOrder} className="card overflow-hidden">
              <input type="hidden" name="supplier" value={supplier} />
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-4 py-3 sm:px-5">
                <h2 className="font-display text-2xl">{supplier || "No supplier set"}</h2>
                <p className="text-sm text-muted">Estimate: {money(total)}</p>
              </div>
              <ul className="divide-y divide-line">
                {lines.map((p) => (
                  <li key={p.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 sm:px-5">
                    <div className="min-w-0 flex-1 basis-56">
                      <Link href={`/app/stock/${p.id}`} className="text-sm font-medium underline-offset-4 hover:underline">
                        {p.name}
                      </Link>
                      <p className="text-xs text-muted">
                        {[
                          `${p.available} available (threshold ${p.minStock})`,
                          p.reserved > 0 && `${p.reserved} reserved`,
                          p.onOrder > 0 && `${p.onOrder} already on order`,
                          p.sold30 > 0 && `${p.sold30} sold in 30 days`,
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                    </div>
                    <label className="flex items-center gap-2 text-sm text-muted">
                      Quantity
                      <input
                        name={`qty:${p.id}`}
                        inputMode="numeric"
                        defaultValue={p.toOrder}
                        className="input w-20"
                        aria-label={`Quantity to order for ${p.name}`}
                      />
                    </label>
                  </li>
                ))}
              </ul>
              <div className="border-t border-line px-4 py-3 sm:px-5">
                <button className="btn btn-primary">Create purchase order</button>
              </div>
            </form>
          );
        })
      )}

      {pending.length > 0 && (
        <section>
          <h2 className="mb-3 font-display text-2xl">Orders awaiting delivery</h2>
          <ul className="space-y-3">
            {pending.map((order) => (
              <li key={order.id} className="card p-4 sm:p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium tabular-nums">
                      {order.number}
                      {order.supplier && <span className="font-normal text-muted"> · {order.supplier}</span>}
                    </p>
                    <p className="text-xs text-muted">Ordered {dateFormat.format(order.createdAt)}</p>
                  </div>
                  <div className="flex gap-2">
                    <form action={cancelPurchaseOrder}>
                      <input type="hidden" name="id" value={order.id} />
                      <ConfirmButton message={`Cancel order ${order.number}?`} className="btn btn-ghost">
                        Cancel
                      </ConfirmButton>
                    </form>
                    <form action={receivePurchaseOrder}>
                      <input type="hidden" name="id" value={order.id} />
                      <button className="btn btn-accent">Mark as received</button>
                    </form>
                  </div>
                </div>
                <ul className="mt-3 space-y-1 text-sm">
                  {order.items.map((item) => (
                    <li key={item.id} className="flex justify-between gap-3">
                      <span className="min-w-0 truncate">
                        {item.quantity} × {item.name}
                      </span>
                      <span className="shrink-0 text-muted tabular-nums">{money(item.quantity * item.costPrice)}</span>
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        </section>
      )}

      {history.length > 0 && (
        <section>
          <h2 className="mb-3 font-display text-2xl">Order history</h2>
          <ul className="card divide-y divide-line">
            {history.map((order) => (
              <li key={order.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-sm sm:px-5">
                <span className="tabular-nums">
                  {order.number}
                  {order.supplier && <span className="text-muted"> · {order.supplier}</span>}
                  <span className="text-muted"> · {order.items.reduce((s, i) => s + i.quantity, 0)} item(s)</span>
                </span>
                <Badge
                  label={order.status === "recue" ? `Received ${dateFormat.format(order.receivedAt ?? order.createdAt)}` : "Cancelled"}
                  tone={order.status === "recue" ? "good" : "neutral"}
                />
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
