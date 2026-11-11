"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, count, eq } from "drizzle-orm";
import { z } from "zod";
import { getDb, schema } from "@/db";
import { requireSession } from "@/lib/auth";
import type { FormState } from "@/lib/types";

const clientSchema = z.object({
  id: z.uuid().optional(),
  name: z.string().trim().min(1, "The client name is required.").max(200),
  kind: z.enum(["particulier", "entreprise"]),
  email: z.union([z.literal(""), z.email("Invalid email address.")]),
  phone: z.string().trim().max(50),
  address: z.string().trim().max(500),
  notes: z.string().trim().max(2000),
});

export async function saveClient(_prev: FormState, formData: FormData): Promise<FormState> {
  const { org } = await requireSession();
  const parsed = clientSchema.safeParse({
    id: formData.get("id") || undefined,
    name: formData.get("name"),
    kind: formData.get("kind") ?? "particulier",
    email: String(formData.get("email") ?? "").trim(),
    phone: formData.get("phone") ?? "",
    address: formData.get("address") ?? "",
    notes: formData.get("notes") ?? "",
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const db = await getDb();
  const { id, ...values } = parsed.data;
  let clientId = id;
  if (id) {
    await db
      .update(schema.clients)
      .set(values)
      .where(and(eq(schema.clients.id, id), eq(schema.clients.orgId, org.id)));
  } else {
    const [created] = await db
      .insert(schema.clients)
      .values({ ...values, orgId: org.id })
      .returning({ id: schema.clients.id });
    clientId = created.id;
  }
  revalidatePath("/app", "layout");
  redirect(`/app/clients/${clientId}`);
}

export async function deleteClient(_prev: FormState, formData: FormData): Promise<FormState> {
  const { org } = await requireSession();
  const id = z.uuid().safeParse(formData.get("id"));
  if (!id.success) return { error: "Client not found." };

  const db = await getDb();
  const [{ n }] = await db
    .select({ n: count() })
    .from(schema.documents)
    .where(and(eq(schema.documents.clientId, id.data), eq(schema.documents.orgId, org.id)));
  if (n > 0) {
    return { error: `This client has ${n} quote(s) or invoice(s). Delete them first to remove the client.` };
  }
  await db.delete(schema.clients).where(and(eq(schema.clients.id, id.data), eq(schema.clients.orgId, org.id)));
  revalidatePath("/app", "layout");
  redirect("/app/clients");
}
