// POST /api/signer/download-keys/save-preauth — Bearer token
// Body: { key, multiUse, maxUses, notes }
// Δημιουργεί ένα pre-approved key (status='preauth') που περιμένει user.

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
      return Response.json({ error: "Το κλειδί πρέπει να είναι τουλάχιστον 8 χαρακτήρες." }, { status: 400 });
    }

    // UPSERT — αν υπάρχει ήδη, δεν αλλάζει status (αποφεύγει race conditions)
    // Αν είναι νέο: status='preauth'
    // Αν υπάρχει με status='preauth': update metadata
    // Αν υπάρχει με άλλο status: refuse (μη επιτρέψουμε override)
    const existing = await sql`
      SELECT id, status FROM download_keys WHERE key = ${key} LIMIT 1
    `;

    if (existing.length === 0) {
      await sql`
        INSERT INTO download_keys (key, status, multi_use, max_uses, notes, first_seen_at, last_seen_at)
        VALUES (${key}, 'preauth', ${multiUse}, ${maxUses}, ${notes}, NOW(), NOW())
      `;
      return Response.json({ ok: true, created: true });
    }

    if (existing[0].status !== "preauth") {
      return Response.json(
        { error: `Το κλειδί υπάρχει ήδη με κατάσταση '${existing[0].status}'. Δεν μπορεί να ξαναγίνει pre-approved.` },
        { status: 409 }
      );
    }

    // Update existing preauth (αλλαγή metadata)
    await sql`
      UPDATE download_keys
      SET multi_use = ${multiUse}, max_uses = ${maxUses}, notes = ${notes}
      WHERE id = ${existing[0].id}
    `;
    return Response.json({ ok: true, created: false });
  } catch (err) {
    console.error("[SMAct] Save preauth error:", err);
    return Response.json({ error: "Σφάλμα διακομιστή." }, { status: 500 });
  }
}
