// POST /api/admin/download-reject — Admin cookie
// Body: { key }
// Απορρίπτει ένα download key από το admin panel.

import { neon } from "@neondatabase/serverless";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const COOKIE_NAME = "smact_admin";
const sql = neon(process.env.DATABASE_URL);

function safeEqual(a, b) {
  if (typeof a !== "string" || typeof b !== "string") return false;
  if (a.length !== b.length) return false;
  let m = 0;
  for (let i = 0; i < a.length; i++) m |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return m === 0;
}

function isAdmin(request) {
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminPassword) return false;
  const cookieHeader = request.headers.get("cookie") || "";
  const match = cookieHeader.match(
    new RegExp(`(?:^|;\\s*)${COOKIE_NAME}=([^;]*)`)
  );
  if (!match) return false;
  return safeEqual(decodeURIComponent(match[1]), adminPassword);
}

export async function POST(request) {
  if (!isAdmin(request)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const body = await request.json();
    const key = String(body.key || "").trim();
    if (!key) return Response.json({ error: "Λείπει το κλειδί." }, { status: 400 });

    await sql`
      UPDATE download_keys
      SET status = 'rejected'
      WHERE key = ${key}
    `;
    return Response.json({ ok: true });
  } catch (err) {
    console.error("[SMAct] Admin download reject error:", err);
    return Response.json({ error: "Σφάλμα διακομιστή." }, { status: 500 });
  }
}
