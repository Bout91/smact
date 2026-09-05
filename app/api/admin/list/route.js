// ─────────────────────────────────────────────────────────
// GET /api/admin/list?status=pending|ready|history
//
// Φάση 8: JOIN με request_machines — κάθε request έχει array από machines.
//   • pending  → status='pending' (auto-delete μετά 30 μέρες)
//   • ready    → status='ready' AND hidden_from_completed_at IS NULL
//   • history  → status='ready' (ΟΛΕΣ)
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

async function fetchRequestsWithMachines(baseRows) {
  if (baseRows.length === 0) return [];
  const ids = baseRows.map((r) => r.id);

  const machines = await sql`
    SELECT id, request_id, machine_id, activation_key, ready_at, position
    FROM request_machines
    WHERE request_id = ANY(${ids}::uuid[])
    ORDER BY request_id, position ASC
  `;

  const byRequestId = new Map();
  for (const m of machines) {
    if (!byRequestId.has(m.request_id)) byRequestId.set(m.request_id, []);
    byRequestId.get(m.request_id).push({
      id: m.id,
      machineId: m.machine_id,
      activationKey: m.activation_key,
      readyAt:
        m.ready_at instanceof Date
          ? m.ready_at.toISOString()
          : m.ready_at,
      position: m.position,
    });
  }

  return baseRows.map((r) => {
    const list = byRequestId.get(r.id) || [];
    const approvedCount = list.filter((x) => x.activationKey).length;
    return {
      id: r.id,
      pickupCode: r.pickup_code,
      unit: r.unit,
      office: r.office,
      status: r.status,
      submittedAt:
        r.submitted_at instanceof Date
          ? r.submitted_at.toISOString()
          : r.submitted_at,
      readyAt:
        r.ready_at instanceof Date ? r.ready_at.toISOString() : r.ready_at,
      machines: list,
      totalMachines: list.length,
      approvedMachines: approvedCount,
    };
  });
}

export async function GET(request) {
  if (!isAdmin(request)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");

    let baseRows;
    if (status === "pending") {
      baseRows = await sql`
        SELECT id, pickup_code, unit, office, status,
               submitted_at, ready_at
        FROM requests
        WHERE status = 'pending'
        ORDER BY submitted_at ASC
      `;
    } else if (status === "ready") {
      baseRows = await sql`
        SELECT id, pickup_code, unit, office, status,
               submitted_at, ready_at
        FROM requests
        WHERE status = 'ready' AND hidden_from_completed_at IS NULL
        ORDER BY ready_at DESC
      `;
    } else if (status === "history") {
      baseRows = await sql`
        SELECT id, pickup_code, unit, office, status,
               submitted_at, ready_at
        FROM requests
        WHERE status = 'ready'
        ORDER BY ready_at DESC
      `;
    } else {
      baseRows = await sql`
        SELECT id, pickup_code, unit, office, status,
               submitted_at, ready_at
        FROM requests
        ORDER BY submitted_at DESC
      `;
    }

    const rows = await fetchRequestsWithMachines(baseRows);

    const counts = await sql`
      SELECT
        COUNT(*) FILTER (WHERE status = 'pending') AS pending_count,
        COUNT(*) FILTER (
          WHERE status = 'ready' AND hidden_from_completed_at IS NULL
        ) AS ready_count,
        COUNT(*) FILTER (WHERE status = 'ready') AS history_count
      FROM requests
    `;

    return Response.json({
      requests: rows,
      counts: {
        pending: Number(counts[0].pending_count),
        ready: Number(counts[0].ready_count),
        history: Number(counts[0].history_count),
      },
    });
  } catch (err) {
    console.error("[SMAct] Admin list error:", err);
    return Response.json({ error: "Σφάλμα διακομιστή." }, { status: 500 });
  }
}
