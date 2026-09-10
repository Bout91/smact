// POST /api/admin/settings/save — admin only
// Body: { key, value } - UPSERT into site_settings

import { neon } from "@neondatabase/serverless";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const COOKIE_NAME = "smact_admin";
const sql = neon(process.env.DATABASE_URL);

const ALLOWED_KEYS = new Set([
  "download_drive_url",
  "download_contact_message",
  "download_contact_details",
]);

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
    const value = String(body.value || "").trim();

    if (!ALLOWED_KEYS.has(key)) {
      return Response.json({ error: "Άγνωστο key." }, { status: 400 });
    }
    if (value.length > 2000) {
      return Response.json({ error: "Πολύ μεγάλο value." }, { status: 400 });
    }

    await sql`
      INSERT INTO site_settings (key, value, updated_at)
      VALUES (${key}, ${value}, NOW())
      ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()
    `;

    return Response.json({ ok: true });
  } catch (err) {
    console.error("[SMAct] Admin settings save error:", err);
    return Response.json({ error: "Σφάλμα διακομιστή." }, { status: 500 });
  }
}
