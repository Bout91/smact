// POST /api/signer/download-keys/delete — Bearer token
// Body: { key }
// Διαγράφει ένα κλειδί (μόνο αν είναι σε status 'preauth' ή 'rejected').

import { neon } from "@neondatabase/serverless";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const sql = neon(process.env.DATABASE_URL);

function safeEqual(a, b) {
  if (typeof a !== "string" || typeof b !== "string") return false;
  if (a.length !== b.length) return false;
  let m = 0;
  for (let i = 0; i < a.length; i++) m |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return m === 0;
}

function isAuthorized(request) {
  const token = process.env.SIGNER_API_TOKEN;
  if (!token || token.length < 20) return false;
  const auth = request.headers.get("authorization") || "";
  const match = auth.match(/^Bearer\s+(.+)$/i);
  if (!match) return false;
  return safeEqual(match[1].trim(), token);
}

export async function POST(request) {
  if (!isAuthorized(request)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const body = await request.json();
    const key = String(body.key || "").trim();
    if (!key) return Response.json({ error: "Λείπει το κλειδί." }, { status: 400 });

    const rows = await sql`
      DELETE FROM download_keys
      WHERE key = ${key} AND status IN ('preauth', 'rejected')
      RETURNING id
    `;
    return Response.json({ ok: true, deleted: rows.length });
  } catch (err) {
    console.error("[SMAct] Delete key error:", err);
    return Response.json({ error: "Σφάλμα διακομιστή." }, { status: 500 });
  }
}
