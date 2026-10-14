import { neon } from "@neondatabase/serverless";
export function db() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL nincs beállítva");
  return neon(url);
}
export async function ownerId() {
  const sql = db();
  const rows = await sql`INSERT INTO app_users(auth_subject) VALUES('primary_owner') ON CONFLICT(auth_subject) DO UPDATE SET auth_subject = EXCLUDED.auth_subject RETURNING id`;
  return rows[0].id as string;
}
