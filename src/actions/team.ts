"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { getDb, schema } from "@/db";
import { hashPassword, requireSession, verifyPassword } from "@/lib/auth";
import type { FormState } from "@/lib/types";

const password = z.string().min(8, "The password must be at least 8 characters.").max(200);

async function requireOwner() {
  const session = await requireSession();
  return session.user.role === "owner" ? session : null;
}

const memberSchema = z.object({
  name: z.string().trim().min(1, "Enter the employee's name.").max(100),
  email: z.email("Invalid email address.").max(200),
  password,
});

export async function addMember(_prev: FormState, formData: FormData): Promise<FormState> {
  const session = await requireOwner();
  if (!session) return { error: "Only the account owner can manage the team." };
  const parsed = memberSchema.safeParse({
    name: formData.get("name"),
    email: String(formData.get("email") ?? "").trim().toLowerCase(),
    password: formData.get("password"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const db = await getDb();
  const existing = await db
    .select({ id: schema.users.id })
    .from(schema.users)
    .where(eq(schema.users.email, parsed.data.email));
  if (existing.length) return { error: "An account already exists with this email." };

  await db.insert(schema.users).values({
    orgId: session.org.id,
    name: parsed.data.name,
    email: parsed.data.email,
    passwordHash: await hashPassword(parsed.data.password),
    role: "member",
  });
  revalidatePath("/app/settings");
  return { ok: true };
}

/** Le responsable redonne un mot de passe à un employé qui l'a oublié. */
export async function resetMemberPassword(_prev: FormState, formData: FormData): Promise<FormState> {
  const session = await requireOwner();
  if (!session) return { error: "Only the account owner can manage the team." };
  const id = z.uuid().safeParse(formData.get("id"));
  const parsed = password.safeParse(formData.get("password"));
  if (!id.success) return { error: "Employee not found." };
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const db = await getDb();
  const [member] = await db
    .select({ id: schema.users.id })
    .from(schema.users)
    .where(and(eq(schema.users.id, id.data), eq(schema.users.orgId, session.org.id), eq(schema.users.role, "member")));
  if (!member) return { error: "Employee not found." };

  await db.update(schema.users).set({ passwordHash: await hashPassword(parsed.data) }).where(eq(schema.users.id, member.id));
  // On le déconnecte partout : il se reconnecte avec le nouveau mot de passe
  await db.delete(schema.sessions).where(eq(schema.sessions.userId, member.id));
  return { ok: true };
}

export async function removeMember(formData: FormData) {
  const session = await requireOwner();
  if (!session) return;
  const id = z.uuid().parse(formData.get("id"));
  const db = await getDb();
  await db
    .delete(schema.users)
    .where(and(eq(schema.users.id, id), eq(schema.users.orgId, session.org.id), eq(schema.users.role, "member")));
  revalidatePath("/app/settings");
}

export async function changePassword(_prev: FormState, formData: FormData): Promise<FormState> {
  const { user } = await requireSession();
  const parsed = password.safeParse(formData.get("next"));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  if (!(await verifyPassword(String(formData.get("current") ?? ""), user.passwordHash))) {
    return { error: "The current password is incorrect." };
  }
  const db = await getDb();
  await db.update(schema.users).set({ passwordHash: await hashPassword(parsed.data) }).where(eq(schema.users.id, user.id));
  return { ok: true };
}
