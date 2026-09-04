// ─────────────────────────────────────────────────────────
// POST /api/admin/approve
// Body: { id: uuid, activationKey: string }
// Ενημερώνει την αίτηση: status='ready', activation_key, ready_at=NOW()
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
    const activationKey = String(body.activationKey || "").trim();

    if (!id) {
      return Response.json(
        { error: "Λείπει το id της αίτησης." },
        { status: 400 }
      );
    }
    if (!activationKey) {
      return Response.json(
        { error: "Το activation key είναι υποχρεωτικό." },
        { status: 400 }
      );
    }

    const rows = await sql`
      UPDATE requests
      SET status = 'ready',
          activation_key = ${activationKey},
          ready_at = NOW()
      WHERE id = ${id}
      RETURNING id, ready_at
    `;

    if (rows.length === 0) {
      return Response.json(
        { error: "Δεν βρέθηκε η αίτηση." },
        { status: 404 }
      );
    }

    const readyAt =
      rows[0].ready_at instanceof Date
        ? rows[0].ready_at.toISOString()
        : rows[0].ready_at;

    console.log("[SMAct] Request approved:", { id: rows[0].id, readyAt });

    return Response.json({ ok: true, readyAt });
  } catch (err) {
    console.error("[SMAct] Approve error:", err);
    return Response.json({ error: "Σφάλμα διακομιστή." }, { status: 500 });
  }
}
