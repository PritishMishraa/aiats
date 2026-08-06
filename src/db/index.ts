import { neon } from "@neondatabase/serverless"; import { drizzle } from "drizzle-orm/neon-http"; import * as schema from "./schema";
let instance: ReturnType<typeof createDb> | null = null;
function createDb() { const url = process.env.DATABASE_URL; if (!url) throw new Error("DATABASE_URL is not configured"); return drizzle(neon(url), { schema }); }
export function getDb() { return instance ??= createDb(); }
