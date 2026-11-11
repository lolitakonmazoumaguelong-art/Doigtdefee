"use server";

import { revalidatePath } from "next/cache";
import { and, count, eq, inArray, sql } from "drizzle-orm";
import { z } from "zod";
import { getDb, schema } from "@/db";
import { requireSession } from "@/lib/auth";

/** Crée un bon de commande à partir des quantités saisies (champs "qty:<id article>"). */
export async function createPurchaseOrder(formData: FormData) {
  const { org } = await requireSession();
  const supplier = String(formData.get("supplier") ?? "").trim().slice(0, 100);

  const wanted = new Map<string, number>();
  for (const [key, value] of formData.entries()) {
    if (!key.startsWith("qty:")) continue;
    const id = z.uuid().safeParse(key.slice(4));
    const quantity = Math.floor(Number(value));
    if (id.success && Number.isFinite(quantity) && quantity > 0 && quantity <= 1_000_000) wanted.set(id.data, quantity);
  }
  if (!wanted.size) return;

  const db = await getDb();
  await db.transaction(async (tx) => {
    const products = await tx
      .select({ id: schema.products.id, name: schema.products.name, costPrice: schema.products.costPrice })
      .from(schema.products)
      .where(
        and(inArray(schema.products.id, [...wanted.keys()]), eq(schema.products.orgId, org.id), eq(schema.products.kind, "produit")),
      );
    if (!products.length) return;
    const [{ n }] = await tx.select({ n: count() }).from(schema.purchaseOrders).where(eq(schema.purchaseOrders.orgId, org.id));
    const year = new Date().getFullYear();
    const [order] = await tx
      .insert(schema.purchaseOrders)
      .values({ orgId: org.id, supplier, number: `PO-${year}-${String(n + 1).padStart(3, "0")}` })
      .returning({ id: schema.purchaseOrders.id });
    await tx.insert(schema.purchaseItems).values(
      products.map((p) => ({ orderId: order.id, productId: p.id, name: p.name, quantity: wanted.get(p.id)!, costPrice: p.costPrice })),
    );
  });
  revalidatePath("/app", "layout");
}

/** Réception : le matériel commandé entre en stock automatiquement. */
export async function receivePurchaseOrder(formData: FormData) {
  const { org } = await requireSession();
  const id = z.uuid().parse(formData.get("id"));
  const db = await getDb();
  await db.transaction(async (tx) => {
    const updated = await tx
      .update(schema.purchaseOrders)
      .set({ status: "recue", receivedAt: new Date() })
      .where(and(eq(schema.purchaseOrders.id, id), eq(schema.purchaseOrders.orgId, org.id), eq(schema.purchaseOrders.status, "commande")))
      .returning({ number: schema.purchaseOrders.number, supplier: schema.purchaseOrders.supplier });
    if (!updated.length) return;
    const items = await tx.select().from(schema.purchaseItems).where(eq(schema.purchaseItems.orderId, id));
    for (const item of items) {
      if (!item.productId) continue;
      await tx
        .update(schema.products)
        .set({ stock: sql`${schema.products.stock} + ${item.quantity}` })
        .where(and(eq(schema.products.id, item.productId), eq(schema.products.orgId, org.id)));
      await tx.insert(schema.stockMovements).values({
        orgId: org.id,
        productId: item.productId,
        delta: item.quantity,
        reason: "commande",
        note: [updated[0].number, updated[0].supplier].filter(Boolean).join(" · "),
      });
    }
  });
  revalidatePath("/app", "layout");
}

export async function cancelPurchaseOrder(formData: FormData) {
  const { org } = await requireSession();
  const id = z.uuid().parse(formData.get("id"));
  const db = await getDb();
  await db
    .update(schema.purchaseOrders)
    .set({ status: "annulee" })
    .where(and(eq(schema.purchaseOrders.id, id), eq(schema.purchaseOrders.orgId, org.id), eq(schema.purchaseOrders.status, "commande")));
  revalidatePath("/app", "layout");
}
