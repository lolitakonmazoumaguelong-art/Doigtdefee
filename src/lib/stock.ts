import "server-only";
import { and, eq, gt, inArray, sql } from "drizzle-orm";
import { getDb, schema } from "@/db";
import type { Product } from "@/db/schema";

export type StockLine = Product & {
  /** Promis à des clients : devis acceptés non facturés + factures en brouillon */
  reserved: number;
  /** Déjà commandé chez un fournisseur, pas encore reçu */
  onOrder: number;
  /** Vendu sur les 30 derniers jours */
  sold30: number;
  /** Ce qu'on peut réellement promettre aujourd'hui */
  available: number;
  /** Jours de stock restants au rythme actuel (null = pas assez de ventes pour estimer) */
  daysLeft: number | null;
  /** Quantité conseillée à commander (0 = rien à faire) */
  toOrder: number;
};

export async function getStockOverview(orgId: string): Promise<StockLine[]> {
  const db = await getDb();
  const d = schema.documents;
  const since = new Date(Date.now() - 30 * 86_400_000);

  const [products, reservedRows, soldRows, orderRows] = await Promise.all([
    db.select().from(schema.products).where(eq(schema.products.orgId, orgId)).orderBy(schema.products.category, schema.products.name),
    db
      .select({ productId: schema.lineItems.productId, qty: sql<number>`sum(ceil(${schema.lineItems.quantity}))` })
      .from(schema.lineItems)
      .innerJoin(d, eq(d.id, schema.lineItems.documentId))
      .where(
        and(
          eq(d.orgId, orgId),
          sql`${schema.lineItems.productId} is not null`,
          sql`(
            (${d.type} = 'facture' and ${d.status} = 'brouillon')
            or (${d.type} = 'devis' and ${d.status} = 'accepte'
                and not exists (select 1 from documents f where f.source_id = ${d.id}))
          )`,
        ),
      )
      .groupBy(schema.lineItems.productId),
    db
      .select({ productId: schema.stockMovements.productId, qty: sql<number>`sum(-${schema.stockMovements.delta})` })
      .from(schema.stockMovements)
      .where(
        and(
          eq(schema.stockMovements.orgId, orgId),
          inArray(schema.stockMovements.reason, ["facture", "annulation"]),
          gt(schema.stockMovements.createdAt, since),
        ),
      )
      .groupBy(schema.stockMovements.productId),
    db
      .select({ productId: schema.purchaseItems.productId, qty: sql<number>`sum(${schema.purchaseItems.quantity})` })
      .from(schema.purchaseItems)
      .innerJoin(schema.purchaseOrders, eq(schema.purchaseOrders.id, schema.purchaseItems.orderId))
      .where(and(eq(schema.purchaseOrders.orgId, orgId), eq(schema.purchaseOrders.status, "commande")))
      .groupBy(schema.purchaseItems.productId),
  ]);

  const toMap = (rows: { productId: string | null; qty: number }[]) =>
    new Map(rows.filter((r) => r.productId).map((r) => [r.productId!, Number(r.qty) || 0]));
  const reserved = toMap(reservedRows);
  const sold = toMap(soldRows);
  const ordered = toMap(orderRows);

  return products.map((p) => {
    if (p.kind === "service") {
      return { ...p, reserved: 0, onOrder: 0, sold30: 0, available: 0, daysLeft: null, toOrder: 0 };
    }
    const r = reserved.get(p.id) ?? 0;
    const o = ordered.get(p.id) ?? 0;
    const s = Math.max(sold.get(p.id) ?? 0, 0);
    const available = p.stock - r;
    const daysLeft = s > 0 ? Math.max(Math.floor((available / s) * 30), 0) : null;
    // Niveau visé : celui fixé par l'utilisateur, sinon le seuil + un mois de ventes
    const target = p.targetStock > 0 ? p.targetStock : Math.max(p.minStock + s, p.minStock * 2, 1);
    const projected = available + o;
    const toOrder = !p.archived && projected <= p.minStock ? Math.max(target - projected, 1) : 0;
    return { ...p, reserved: r, onOrder: o, sold30: s, available, daysLeft, toOrder };
  });
}

export async function listPurchaseOrders(orgId: string) {
  const db = await getDb();
  const orders = await db
    .select()
    .from(schema.purchaseOrders)
    .where(eq(schema.purchaseOrders.orgId, orgId))
    .orderBy(sql`${schema.purchaseOrders.createdAt} desc`)
    .limit(30);
  if (!orders.length) return [];
  const items = await db
    .select()
    .from(schema.purchaseItems)
    .where(
      inArray(
        schema.purchaseItems.orderId,
        orders.map((o) => o.id),
      ),
    );
  return orders.map((o) => ({ ...o, items: items.filter((i) => i.orderId === o.id) }));
}
