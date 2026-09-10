// POST /api/signer/download-keys/approve — Bearer token
// Body: { key, multiUse, maxUses (nullable), notes }

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
    const multiUse = body.multiUse === true;
    const notes = String(body.notes || "").trim() || null;
    let maxUses = null;
    if (multiUse && body.maxUses) {
      const n = parseInt(body.maxUses, 10);
      if (Number.isFinite(n) && n > 0) maxUses = n;
    }

    if (!key || key.length < 8) {
      return Response.json({ error: "Λάθος κλειδί." }, { status: 400 });
    }

    // Approve — regardless of prior state (in case admin wants to re-approve a rejected key)
    const rows = await sql`
      UPDATE download_keys
      SET status = 'approved',
          multi_use = ${multiUse},
          max_uses = ${maxUses},
          notes = ${notes},
          approved_at = NOW(),
          use_count = 0
      WHERE key = ${key}
      RETURNING id, approved_at
    `;

    if (rows.length === 0) {
      // Key doesn't exist yet — INSERT it as pre-approved (useful if admin wants to create a key that hasn't been requested yet)
      await sql`
        INSERT INTO download_keys (key, status, multi_use, max_uses, notes, first_seen_at, last_seen_at, approved_at)
        VALUES (${key}, 'approved', ${multiUse}, ${maxUses}, ${notes}, NOW(), NOW(), NOW())
      `;
    }

    return Response.json({ ok: true });
  } catch (err) {
    console.error("[SMAct] Signer download approve error:", err);
    return Response.json({ error: "Σφάλμα διακομιστή." }, { status: 500 });
  }
}
