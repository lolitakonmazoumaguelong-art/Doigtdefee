"use server";

import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { getDb, schema } from "@/db";
import { createSession, destroySession, hashPassword, verifyPassword } from "@/lib/auth";
import { CURRENCY_CODES } from "@/lib/format";
import type { FormState } from "@/lib/types";

const signupSchema = z.object({
  company: z.string().trim().min(1, "Enter the company name.").max(200),
  name: z.string().trim().min(1, "Enter your name.").max(100),
  email: z.email("Invalid email address.").max(200),
  password: z.string().min(8, "The password must be at least 8 characters.").max(200),
  currency: z.enum(CURRENCY_CODES, "Choose a currency."),
});

export async function signup(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = signupSchema.safeParse({
    company: formData.get("company"),
    name: formData.get("name"),
    email: String(formData.get("email") ?? "").trim().toLowerCase(),
    password: formData.get("password"),
    currency: formData.get("currency"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const db = await getDb();
  const { company, name, email, password, currency } = parsed.data;
  const existing = await db.select({ id: schema.users.id }).from(schema.users).where(eq(schema.users.email, email));
  if (existing.length) return { error: "An account already exists with this email." };

  const passwordHash = await hashPassword(password);
  const userId = await db.transaction(async (tx) => {
    const [org] = await tx.insert(schema.orgs).values({ name: company, currency, email }).returning({ id: schema.orgs.id });
    const [user] = await tx
      .insert(schema.users)
      .values({ orgId: org.id, name, email, passwordHash, role: "owner" })
      .returning({ id: schema.users.id });
    return user.id;
  });
  await createSession(userId);
  redirect("/app");
}

export async function login(_prev: FormState, formData: FormData): Promise<FormState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  if (!email || !password) return { error: "Fill in both fields." };

  const db = await getDb();
  const [user] = await db.select().from(schema.users).where(eq(schema.users.email, email));
  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    return { error: "Incorrect email or password." };
  }
  await createSession(user.id);
  redirect("/app");
}

export async function logout() {
  await destroySession();
  redirect("/");
}
