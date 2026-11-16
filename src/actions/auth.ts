"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { and, count, eq, gt } from "drizzle-orm";
import { z } from "zod";
import { getDb, schema } from "@/db";
import { createHash, randomBytes } from "node:crypto";
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
  // Installation dédiée à un seul client : une fois son entreprise créée, plus d'inscription
  if (process.env.SIGNUP_CLOSED === "1") {
    const [{ n }] = await db.select({ n: count() }).from(schema.orgs);
    if (n > 0) return { error: "Sign-ups are closed on this installation. Ask the owner to create a login for you." };
  }
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
  // Pas plus de 8 essais ratés par adresse sur 15 minutes
  const since = new Date(Date.now() - 15 * 60_000);
  const [{ n: failures }] = await db
    .select({ n: count() })
    .from(schema.loginAttempts)
    .where(and(eq(schema.loginAttempts.email, email), gt(schema.loginAttempts.createdAt, since)));
  if (failures >= 8) return { error: "Too many failed attempts. Please wait 15 minutes and try again." };

  const [user] = await db.select().from(schema.users).where(eq(schema.users.email, email));
  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    await db.insert(schema.loginAttempts).values({ email: email.slice(0, 200) });
    return { error: "Incorrect email or password." };
  }
  await db.delete(schema.loginAttempts).where(eq(schema.loginAttempts.email, email));
  await createSession(user.id);
  redirect("/app");
}

export async function logout() {
  await destroySession();
  redirect("/");
}

const sha256 = (value: string) => createHash("sha256").update(value).digest("hex");

export const emailRecoveryEnabled = async () => !!process.env.RESEND_API_KEY;

/**
 * Envoie un lien de réinitialisation valable 1 heure.
 * La réponse est la même que le compte existe ou non, pour ne pas révéler qui est inscrit.
 */
export async function requestPasswordReset(_prev: FormState, formData: FormData): Promise<FormState> {
  const email = z.email().safeParse(String(formData.get("email") ?? "").trim().toLowerCase());
  if (!email.success) return { error: "Invalid email address." };
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return { error: "Email recovery is not set up yet. Ask your company owner to set a new password for you." };

  const done: FormState = { ok: true, message: "If an account exists for this address, a reset link is on its way. Check your inbox and spam folder." };
  const db = await getDb();
  const [user] = await db.select({ id: schema.users.id, name: schema.users.name }).from(schema.users).where(eq(schema.users.email, email.data));
  if (!user) return done;

  // Un seul lien toutes les 2 minutes par compte
  const recent = await db
    .select({ id: schema.passwordResets.id })
    .from(schema.passwordResets)
    .where(and(eq(schema.passwordResets.userId, user.id), gt(schema.passwordResets.expiresAt, new Date(Date.now() + 58 * 60_000))));
  if (recent.length) return done;

  const token = randomBytes(32).toString("hex");
  await db.insert(schema.passwordResets).values({ id: sha256(token), userId: user.id, expiresAt: new Date(Date.now() + 60 * 60_000) });
  const host = (await headers()).get("host") ?? "";
  const origin = `${host.startsWith("localhost") ? "http" : "https"}://${host}`;
  const link = `${origin}/reset-password/${token}`;
  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM ?? "Doigt de Fée <onboarding@resend.dev>",
        to: [email.data],
        subject: "Reset your Doigt de Fée password",
        text: `Hello ${user.name},\n\nUse this link to choose a new password. It works once and expires in 1 hour:\n${link}\n\nIf you did not ask for this, you can ignore this email.`,
      }),
    });
    if (!response.ok) console.error("Password reset email failed:", response.status);
  } catch (error) {
    console.error("Password reset email failed:", error);
  }
  return done;
}

export async function resetPassword(_prev: FormState, formData: FormData): Promise<FormState> {
  const token = String(formData.get("token") ?? "");
  const password = z.string().min(8, "The password must be at least 8 characters.").max(200).safeParse(formData.get("password"));
  if (!password.success) return { error: password.error.issues[0].message };
  if (!/^[0-9a-f]{64}$/.test(token)) return { error: "This link is not valid." };

  const db = await getDb();
  const [reset] = await db
    .select()
    .from(schema.passwordResets)
    .where(and(eq(schema.passwordResets.id, sha256(token)), gt(schema.passwordResets.expiresAt, new Date())));
  if (!reset) return { error: "This link has expired or was already used. Ask for a new one." };

  await db.update(schema.users).set({ passwordHash: await hashPassword(password.data) }).where(eq(schema.users.id, reset.userId));
  // Le lien ne sert qu'une fois, et toutes les sessions ouvertes sont fermées
  await db.delete(schema.passwordResets).where(eq(schema.passwordResets.userId, reset.userId));
  await db.delete(schema.sessions).where(eq(schema.sessions.userId, reset.userId));
  redirect("/login?reset=1");
}
