// ─────────────────────────────────────────────────────────
// POST /api/admin/delete-bulk
// Body: { ids: [uuid, uuid, ...] }
// Διαγράφει πολλαπλές αιτήσεις μαζί (για το Ιστορικό).
// ─────────────────────────────────────────────────────────

import { neon } from "@neondatabase/serverless";

export const runtime = "nodejs";

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
    const ids = Array.isArray(body.ids) ? body.ids : [];

    // Έλεγχος: μόνο valid UUIDs
    const validIds = ids
      .map((x) => String(x || "").trim())
      .filter((x) => /^[0-9a-f-]{36}$/i.test(x));

    if (validIds.length === 0) {
      return Response.json(
        { error: "Δεν δόθηκαν έγκυρα ids για διαγραφή." },
        { status: 400 }
      );
    }

    if (validIds.length > 500) {
      return Response.json(
        { error: "Πάρα πολλά items σε ένα batch (max 500)." },
        { status: 400 }
      );
    }

    const rows = await sql`
      DELETE FROM requests
      WHERE id = ANY(${validIds}::uuid[])
      RETURNING id
    `;

    console.log(`[SMAct] Bulk delete: ${rows.length} requests deleted`);

    return Response.json({ ok: true, deleted: rows.length });
  } catch (err) {
    console.error("[SMAct] Bulk delete error:", err);
    return Response.json({ error: "Σφάλμα διακομιστή." }, { status: 500 });
  }
}
