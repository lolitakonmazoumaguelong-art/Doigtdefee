"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { getDb, schema } from "@/db";
import { requireSession } from "@/lib/auth";
import { CATEGORY_IDS } from "@/lib/catalog";
import { parseAmount } from "@/lib/format";
import type { FormState } from "@/lib/types";

const MAX_CENTS = 2_000_000_000;
const price = (message: string) => z.number(message).int(message).min(0, message).max(MAX_CENTS, message);
const qty = (message: string) => z.coerce.number(message).int(message).min(0, message).max(1_000_000, message);

const productSchema = z.object({
  id: z.uuid().optional(),
  name: z.string().trim().min(1, "The item name is required.").max(200),
  reference: z.string().trim().max(100),
  category: z.enum(CATEGORY_IDS),
  kind: z.enum(["produit", "service"]),
  unitPrice: price("Invalid selling price."),
  costPrice: price("Invalid cost price."),
  minStock: qty("Invalid alert threshold."),
  targetStock: qty("Invalid ideal stock."),
  supplier: z.string().trim().max(100),
  initialStock: qty("Invalid opening stock."),
});

export async function saveProduct(_prev: FormState, formData: FormData): Promise<FormState> {
  const { org } = await requireSession();
  const parsed = productSchema.safeParse({
    id: formData.get("id") || undefined,
    name: formData.get("name"),
    reference: formData.get("reference") ?? "",
    category: formData.get("category"),
    kind: formData.get("kind") ?? "produit",
    unitPrice: parseAmount(formData.get("unitPrice") || "0"),
    costPrice: parseAmount(formData.get("costPrice") || "0"),
    minStock: formData.get("minStock") || "0",
    targetStock: formData.get("targetStock") || "0",
    supplier: formData.get("supplier") ?? "",
    initialStock: formData.get("initialStock") || "0",
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const db = await getDb();
  const { id, initialStock, ...values } = parsed.data;
  const isService = values.kind === "service";
  if (isService) Object.assign(values, { minStock: 0, targetStock: 0, supplier: "" });

  let productId = id;
  if (id) {
    await db
      .update(schema.products)
      .set(values)
      .where(and(eq(schema.products.id, id), eq(schema.products.orgId, org.id)));
  } else {
    await db.transaction(async (tx) => {
      const stock = isService ? 0 : initialStock;
      const [created] = await tx
        .insert(schema.products)
        .values({ ...values, orgId: org.id, stock })
        .returning({ id: schema.products.id });
      productId = created.id;
      if (stock > 0) {
        await tx
          .insert(schema.stockMovements)
          .values({ orgId: org.id, productId: created.id, delta: stock, reason: "entree", note: "Opening stock" });
      }
    });
  }
  revalidatePath("/app", "layout");
  redirect(`/app/stock/${productId}`);
}

const movementSchema = z.object({
  productId: z.uuid(),
  direction: z.enum(["entree", "sortie", "defaut"]),
  quantity: z.coerce
    .number("Invalid quantity.")
    .int("The quantity must be a whole number.")
    .positive("The quantity must be greater than zero.")
    .max(1_000_000),
  note: z.string().trim().max(300),
});

export async function moveStock(_prev: FormState, formData: FormData): Promise<FormState> {
  const { org } = await requireSession();
  const parsed = movementSchema.safeParse({
    productId: formData.get("productId"),
    direction: formData.get("direction"),
    quantity: formData.get("quantity"),
    note: formData.get("note") ?? "",
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { productId, direction, quantity, note } = parsed.data;

  const db = await getDb();
  try {
    await db.transaction(async (tx) => {
      const [product] = await tx
        .select({ stock: schema.products.stock, kind: schema.products.kind })
        .from(schema.products)
        .where(and(eq(schema.products.id, productId), eq(schema.products.orgId, org.id)));
      if (!product || product.kind === "service") throw new Error("Item not found.");
      if (direction !== "entree" && quantity > product.stock) {
        throw new Error(`Not enough stock: only ${product.stock} unit(s) left.`);
      }
      const delta = direction === "entree" ? quantity : -quantity;
      await tx
        .update(schema.products)
        .set({ stock: sql`${schema.products.stock} + ${delta}` })
        .where(eq(schema.products.id, productId));
      await tx.insert(schema.stockMovements).values({ orgId: org.id, productId, delta, reason: direction, note });
    });
  } catch (e) {
    return { error: e instanceof Error && e.message.endsWith(".") ? e.message : "Could not record the movement, please try again." };
  }
  revalidatePath("/app", "layout");
  return { ok: true };
}

export async function deleteProduct(formData: FormData) {
  const { org } = await requireSession();
  const id = z.uuid().parse(formData.get("id"));
  const db = await getDb();
  await db.delete(schema.products).where(and(eq(schema.products.id, id), eq(schema.products.orgId, org.id)));
  revalidatePath("/app", "layout");
  redirect("/app/stock");
}

/** Inventaire : on saisit la quantité réellement comptée, l'écart est tracé. */
export async function setCountedStock(_prev: FormState, formData: FormData): Promise<FormState> {
  const { org } = await requireSession();
  const id = z.uuid().safeParse(formData.get("productId"));
  const counted = qty("Invalid counted quantity.").safeParse(formData.get("counted"));
  if (!id.success) return { error: "Item not found." };
  if (!counted.success || formData.get("counted") === "") return { error: "Invalid counted quantity." };

  const db = await getDb();
  await db.transaction(async (tx) => {
    const [product] = await tx
      .select({ stock: schema.products.stock })
      .from(schema.products)
      .where(and(eq(schema.products.id, id.data), eq(schema.products.orgId, org.id), eq(schema.products.kind, "produit")));
    if (!product || product.stock === counted.data) return;
    await tx.update(schema.products).set({ stock: counted.data }).where(eq(schema.products.id, id.data));
    await tx.insert(schema.stockMovements).values({
      orgId: org.id,
      productId: id.data,
      delta: counted.data - product.stock,
      reason: "inventaire",
      note: `Counted: ${counted.data} (instead of ${product.stock})`,
    });
  });
  revalidatePath("/app", "layout");
  return { ok: true };
}

/** Produit arrêté (ou remis en vente) : il sort du catalogue sans perdre son historique. */
export async function setProductArchived(formData: FormData) {
  const { org } = await requireSession();
  const id = z.uuid().parse(formData.get("id"));
  const db = await getDb();
  await db
    .update(schema.products)
    .set({ archived: formData.get("archived") === "1" })
    .where(and(eq(schema.products.id, id), eq(schema.products.orgId, org.id)));
  revalidatePath("/app", "layout");
}
