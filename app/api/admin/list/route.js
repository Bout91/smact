// ─────────────────────────────────────────────────────────
// GET /api/admin/list?status=pending|ready
// Επιστρέφει τη λίστα αιτήσεων για το admin panel.
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

export async function GET(request) {
  if (!isAdmin(request)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");

    let rows;
    if (status === "pending") {
      // Οι παλιότερες πρώτα, ώστε να τις προλαβαίνει ο Νίκος
      rows = await sql`
        SELECT id, machine_id, pickup_code, unit, office, status,
               activation_key, submitted_at, ready_at
        FROM requests
        WHERE status = 'pending'
        ORDER BY submitted_at ASC
      `;
    } else if (status === "ready") {
      // Οι πιο πρόσφατες πρώτα
      rows = await sql`
        SELECT id, machine_id, pickup_code, unit, office, status,
               activation_key, submitted_at, ready_at
        FROM requests
        WHERE status = 'ready'
        ORDER BY ready_at DESC
      `;
    } else {
      rows = await sql`
        SELECT id, machine_id, pickup_code, unit, office, status,
               activation_key, submitted_at, ready_at
        FROM requests
        ORDER BY submitted_at DESC
      `;
    }

    // Counts για τα tabs
    const counts = await sql`
      SELECT
        COUNT(*) FILTER (WHERE status = 'pending') AS pending_count,
        COUNT(*) FILTER (WHERE status = 'ready')   AS ready_count
      FROM requests
    `;

    return Response.json({
      requests: rows.map((r) => ({
        id: r.id,
        machineId: r.machine_id,
        pickupCode: r.pickup_code,
        unit: r.unit,
        office: r.office,
        status: r.status,
        activationKey: r.activation_key,
        submittedAt:
          r.submitted_at instanceof Date
            ? r.submitted_at.toISOString()
            : r.submitted_at,
        readyAt:
          r.ready_at instanceof Date
            ? r.ready_at.toISOString()
            : r.ready_at,
      })),
      counts: {
        pending: Number(counts[0].pending_count),
        ready: Number(counts[0].ready_count),
      },
    });
  } catch (err) {
    console.error("[SMAct] Admin list error:", err);
    return Response.json({ error: "Σφάλμα διακομιστή." }, { status: 500 });
  }
}
