import { neon } from "@neondatabase/serverless";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is not configured");
}

const sql = neon(databaseUrl);

await sql`
  DO $$
  DECLARE
    tables text;
  BEGIN
    SELECT string_agg(format('%I.%I', schemaname, tablename), ', ')
      INTO tables
      FROM pg_tables
      WHERE schemaname = 'public';

    IF tables IS NOT NULL THEN
      EXECUTE 'TRUNCATE TABLE ' || tables || ' RESTART IDENTITY CASCADE';
    END IF;
  END $$;
`;

console.log("Cleared every table in the public schema.");
