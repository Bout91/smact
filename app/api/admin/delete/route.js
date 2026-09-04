// ─────────────────────────────────────────────────────────
// POST /api/admin/delete
// Body: { id: uuid }
// Διαγράφει την αίτηση από τη DB (μόνιμα).
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
    const id = String(body.id || "").trim();

    if (!id) {
      return Response.json(
        { error: "Λείπει το id της αίτησης." },
        { status: 400 }
      );
    }

    const rows = await sql`
      DELETE FROM requests WHERE id = ${id} RETURNING id
    `;

    if (rows.length === 0) {
      return Response.json(
        { error: "Δεν βρέθηκε η αίτηση." },
        { status: 404 }
      );
    }

    console.log("[SMAct] Request deleted:", { id: rows[0].id });

    return Response.json({ ok: true });
  } catch (err) {
    console.error("[SMAct] Delete error:", err);
    return Response.json({ error: "Σφάλμα διακομιστή." }, { status: 500 });
  }
}
