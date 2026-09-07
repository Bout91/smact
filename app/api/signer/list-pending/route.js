// ─────────────────────────────────────────────────────────
// POST /api/signer/list-pending
//
// Endpoint για το SM Key Signer (.exe) — δέχεται Bearer token
// αντί για admin cookie (γιατί το Electron app δεν έχει browser cookies).
//
// Επιστρέφει όλες τις εκκρεμείς αιτήσεις με τα machine-ids που
// δεν έχουν activation_key ακόμα.
// ─────────────────────────────────────────────────────────

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
  if (!token || token.length < 20) {
    // Refuse if server-side token is missing or too short (safety)
    return false;
  }
  const auth = request.headers.get("authorization") || "";
  const match = auth.match(/^Bearer\s+(.+)$/i);
  if (!match) return false;
  return safeEqual(match[1].trim(), token);
}

export async function POST(request) {
  if (!isAuthorized(request)) {
    return new Response(
      JSON.stringify({ error: "Unauthorized" }),
      {
        status: 401,
        headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
      }
    );
  }

  try {
    // Πάρε όλες τις pending αιτήσεις + τα ανοιχτά machines τους
    const rows = await sql`
      SELECT
        r.id             AS request_id,
        r.pickup_code    AS pickup_code,
        r.unit           AS unit,
        r.office         AS office,
        r.submitted_at   AS submitted_at,
        rm.id            AS machine_row_id,
        rm.machine_id    AS machine_id,
        rm.position      AS position
      FROM requests r
      INNER JOIN request_machines rm ON rm.request_id = r.id
      WHERE r.status = 'pending'
        AND rm.activation_key IS NULL
      ORDER BY r.submitted_at ASC, rm.position ASC
    `;

    // Group by request_id
    const map = new Map();
    for (const row of rows) {
      if (!map.has(row.request_id)) {
        map.set(row.request_id, {
          requestId: row.request_id,
          pickupCode: row.pickup_code,
          unit: row.unit,
          office: row.office,
          submittedAt:
            row.submitted_at instanceof Date
              ? row.submitted_at.toISOString()
              : row.submitted_at,
          pendingMachines: [],
        });
      }
      map.get(row.request_id).pendingMachines.push({
        machineRowId: row.machine_row_id,
        machineId: row.machine_id,
        position: row.position,
      });
    }

    const requests = Array.from(map.values());
    const totalPendingMachines = rows.length;

    return new Response(
      JSON.stringify({
        ok: true,
        requests,
        totalRequests: requests.length,
        totalPendingMachines,
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "no-store",
        },
      }
    );
  } catch (err) {
    console.error("[SMAct] Signer list-pending error:", err);
    return new Response(
      JSON.stringify({ error: "Σφάλμα διακομιστή." }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
