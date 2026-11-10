import "server-only";
import { mkdirSync } from "node:fs";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import * as schema from "./schema";

export type DB = PostgresJsDatabase<typeof schema>;

const globalForDb = globalThis as unknown as { __ddfDb?: Promise<DB> };

async function init(): Promise<DB> {
  const url = process.env.DATABASE_URL;

  // Production : Postgres distant (Supabase, Neon...)
  if (url) {
    const { drizzle } = await import("drizzle-orm/postgres-js");
    const postgres = (await import("postgres")).default;
    // prepare: false est requis par le pooler de Supabase
    return drizzle(postgres(url, { prepare: false }), { schema });
  }

  if (process.env.VERCEL) {
    throw new Error("DATABASE_URL manquant : ajoute l'URL Postgres dans les variables d'environnement.");
  }

  // Local : Postgres embarqué dans un dossier, aucun compte requis
  const { PGlite } = await import("@electric-sql/pglite");
  const { drizzle } = await import("drizzle-orm/pglite");
  const { migrate } = await import("drizzle-orm/pglite/migrator");
  mkdirSync(".data", { recursive: true });
  const db = drizzle(new PGlite(".data/pglite"), { schema });
  await migrate(db, { migrationsFolder: "drizzle" });
  return db as unknown as DB;
}

export function getDb(): Promise<DB> {
  return (globalForDb.__ddfDb ??= init());
}

export { schema };
