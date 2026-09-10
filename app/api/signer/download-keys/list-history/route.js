// POST /api/signer/download-keys/list-history — Bearer token
// Return all download keys (all statuses) for history view

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
      SELECT id, key, status, multi_use, use_count, max_uses,
             first_seen_at, last_seen_at, approved_at, last_download_at, notes
      FROM download_keys
      ORDER BY first_seen_at DESC
      LIMIT 500
    `;
    const items = rows.map((r) => ({
      id: r.id,
      key: r.key,
      status: r.status,
      multiUse: r.multi_use,
      useCount: r.use_count,
      maxUses: r.max_uses,
      firstSeenAt: r.first_seen_at instanceof Date ? r.first_seen_at.toISOString() : r.first_seen_at,
      lastSeenAt: r.last_seen_at instanceof Date ? r.last_seen_at.toISOString() : r.last_seen_at,
      approvedAt: r.approved_at instanceof Date ? r.approved_at.toISOString() : r.approved_at,
      lastDownloadAt: r.last_download_at instanceof Date ? r.last_download_at.toISOString() : r.last_download_at,
      notes: r.notes,
    }));
    return new Response(JSON.stringify({ ok: true, items, count: items.length }), {
      status: 200,
      headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
    });
  } catch (err) {
    console.error("[SMAct] Signer download list-history error:", err);
    return Response.json({ error: "Σφάλμα διακομιστή." }, { status: 500 });
  }
}
