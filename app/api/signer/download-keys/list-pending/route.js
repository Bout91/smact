// POST /api/signer/download-keys/list-pending — Bearer token
// Return all pending download key requests

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
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }
  try {
    const rows = await sql`
      SELECT id, key, first_seen_at, last_seen_at
      FROM download_keys
      WHERE status = 'pending'
      ORDER BY first_seen_at ASC
    `;
    const requests = rows.map((r) => ({
      id: r.id,
      key: r.key,
      firstSeenAt: r.first_seen_at instanceof Date ? r.first_seen_at.toISOString() : r.first_seen_at,
      lastSeenAt: r.last_seen_at instanceof Date ? r.last_seen_at.toISOString() : r.last_seen_at,
    }));
    return new Response(JSON.stringify({ ok: true, requests, count: requests.length }), {
      status: 200,
      headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
    });
  } catch (err) {
    console.error("[SMAct] Signer download list-pending error:", err);
    return Response.json({ error: "Σφάλμα διακομιστή." }, { status: 500 });
  }
}
