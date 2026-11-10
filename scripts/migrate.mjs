// Applique les migrations sur la base distante : DATABASE_URL=... npm run db:migrate
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL manquant.");
  process.exit(1);
}

const sql = postgres(url, { max: 1, prepare: false });
await migrate(drizzle(sql), { migrationsFolder: "drizzle" });
await sql.end();
console.log("Migrations appliquées.");
