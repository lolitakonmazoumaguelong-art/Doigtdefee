"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { getDb, schema } from "@/db";
import { requireSession } from "@/lib/auth";
import type { FormState } from "@/lib/types";

export async function postMessage(_prev: FormState, formData: FormData): Promise<FormState> {
  const { org, user } = await requireSession();
  const body = z
    .string()
    .trim()
    .min(1, "Write a message before sending.")
    .max(2000, "Message too long (2000 characters max).")
    .safeParse(formData.get("body"));
  if (!body.success) return { error: body.error.issues[0].message };

  const db = await getDb();
  await db.insert(schema.messages).values({
    orgId: org.id,
    userId: user.id,
    authorName: user.name,
    body: body.data,
    // Seul le responsable peut épingler une consigne
    pinned: user.role === "owner" && formData.get("pinned") === "on",
  });
  await db.update(schema.users).set({ messagesReadAt: new Date() }).where(eq(schema.users.id, user.id));
  revalidatePath("/app", "layout");
  return { ok: true };
}

export async function markMessagesRead() {
  const { user } = await requireSession();
  const db = await getDb();
  await db.update(schema.users).set({ messagesReadAt: new Date() }).where(eq(schema.users.id, user.id));
}

/** Chacun supprime ses messages ; le responsable peut tout supprimer ou désépingler. */
export async function deleteMessage(formData: FormData) {
  const { org, user } = await requireSession();
  const id = z.uuid().parse(formData.get("id"));
  const db = await getDb();
  await db
    .delete(schema.messages)
    .where(
      and(
        eq(schema.messages.id, id),
        eq(schema.messages.orgId, org.id),
        user.role === "owner" ? undefined : eq(schema.messages.userId, user.id),
      ),
    );
  revalidatePath("/app/messages");
}

export async function unpinMessage(formData: FormData) {
  const { org, user } = await requireSession();
  if (user.role !== "owner") return;
  const id = z.uuid().parse(formData.get("id"));
  const db = await getDb();
  await db
    .update(schema.messages)
    .set({ pinned: false })
    .where(and(eq(schema.messages.id, id), eq(schema.messages.orgId, org.id)));
  revalidatePath("/app/messages");
}
