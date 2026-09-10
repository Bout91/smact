// POST /api/admin/reject — Admin cookie
// Body: { requestId, machineRowId }
// Ίδια λειτουργία με /api/signer/reject-machine αλλά με admin cookie auth.

import { neon } from "@neondatabase/serverless";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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
    const requestId = String(body.requestId || "").trim();
    const machineRowId = String(body.machineRowId || "").trim();

    if (!/^[0-9a-f-]{36}$/i.test(requestId) || !/^[0-9a-f-]{36}$/i.test(machineRowId)) {
      return Response.json({ error: "Λάθος id." }, { status: 400 });
    }

    const del = await sql`
      DELETE FROM request_machines
      WHERE id = ${machineRowId} AND request_id = ${requestId}
      RETURNING id
    `;
    if (del.length === 0) {
      return Response.json({ error: "Δεν βρέθηκε." }, { status: 404 });
    }

    const remaining = await sql`
      SELECT COUNT(*)::int AS cnt FROM request_machines WHERE request_id = ${requestId}
    `;
    let requestDeleted = false;
    if (remaining[0].cnt === 0) {
      await sql`DELETE FROM requests WHERE id = ${requestId}`;
      requestDeleted = true;
    }

    return Response.json({ ok: true, requestDeleted });
  } catch (err) {
    console.error("[SMAct] Admin reject error:", err);
    return Response.json({ error: "Σφάλμα διακομιστή." }, { status: 500 });
  }
}
