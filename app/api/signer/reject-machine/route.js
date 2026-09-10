// POST /api/signer/reject-machine — Bearer token
// Body: { requestId, machineRowId }
// Απορρίπτει ένα συγκεκριμένο machine-id (πχ ψεύτικο) — το διαγράφει από το request.
// Αν η αίτηση μείνει άδεια, διαγράφεται και η αίτηση.

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
    const requestId = String(body.requestId || "").trim();
    const machineRowId = String(body.machineRowId || "").trim();

    if (!/^[0-9a-f-]{36}$/i.test(requestId) || !/^[0-9a-f-]{36}$/i.test(machineRowId)) {
      return Response.json({ error: "Λάθος id." }, { status: 400 });
    }

    // Delete the specific machine row
    const del = await sql`
      DELETE FROM request_machines
      WHERE id = ${machineRowId} AND request_id = ${requestId}
      RETURNING id
    `;
    if (del.length === 0) {
      return Response.json({ error: "Δεν βρέθηκε." }, { status: 404 });
    }

    // Check if request has any remaining machines
    const remaining = await sql`
      SELECT COUNT(*)::int AS cnt FROM request_machines WHERE request_id = ${requestId}
    `;
    let requestDeleted = false;
    if (remaining[0].cnt === 0) {
      // No machines left — delete the request entirely
      await sql`DELETE FROM requests WHERE id = ${requestId}`;
      requestDeleted = true;
    }

    return Response.json({ ok: true, requestDeleted });
  } catch (err) {
    console.error("[SMAct] Reject machine error:", err);
    return Response.json({ error: "Σφάλμα διακομιστή." }, { status: 500 });
  }
}
