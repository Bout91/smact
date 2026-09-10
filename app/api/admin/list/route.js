// ─────────────────────────────────────────────────────────
// GET /api/admin/list?status=pending|ready|history
//
// Φάση 12b: Επιστρέφει ΚΑΙ activation requests ΚΑΙ download key requests
// μαζί, με field 'type' για να ξεχωρίζουν στο UI.
//
//   • pending  → activation status='pending' + download status='pending'
//   • ready    → activation status='ready' (μη κρυμμένα) + download status='approved'
//   • history  → activation status='ready' (όλα) + download status IN ('approved','used_up')
// ─────────────────────────────────────────────────────────

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
        m.ready_at instanceof Date ? m.ready_at.toISOString() : m.ready_at,
      position: m.position,
    });
  }

  return baseRows.map((r) => {
    const list = byRequestId.get(r.id) || [];
    const approvedCount = list.filter((x) => x.activationKey).length;
    return {
      type: "activation",
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
      downloadKey: r.download_key || null,
      machines: list,
      totalMachines: list.length,
      approvedMachines: approvedCount,
    };
  });
}

function mapDownloadRow(r) {
  return {
    type: "download",
    id: r.id,
    key: r.key,
    status: r.status,
    multiUse: r.multi_use,
    useCount: r.use_count,
    maxUses: r.max_uses,
    notes: r.notes,
    submittedAt: r.first_seen_at instanceof Date ? r.first_seen_at.toISOString() : r.first_seen_at,
    lastSeenAt: r.last_seen_at instanceof Date ? r.last_seen_at.toISOString() : r.last_seen_at,
    approvedAt: r.approved_at instanceof Date ? r.approved_at.toISOString() : r.approved_at,
    lastDownloadAt: r.last_download_at instanceof Date ? r.last_download_at.toISOString() : r.last_download_at,
  };
}

export async function GET(request) {
  if (!isAdmin(request)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");

    let baseRows;
    let dlRows;

    if (status === "pending") {
      baseRows = await sql`
        SELECT id, pickup_code, unit, office, status,
               submitted_at, ready_at, download_key
        FROM requests
        WHERE status = 'pending'
        ORDER BY submitted_at ASC
      `;
      dlRows = await sql`
        SELECT id, key, status, multi_use, use_count, max_uses, notes,
               first_seen_at, last_seen_at, approved_at, last_download_at
        FROM download_keys
        WHERE status = 'pending'
        ORDER BY first_seen_at ASC
      `;
    } else if (status === "ready") {
      baseRows = await sql`
        SELECT id, pickup_code, unit, office, status,
               submitted_at, ready_at, download_key
        FROM requests
        WHERE status = 'ready' AND hidden_from_completed_at IS NULL
        ORDER BY ready_at DESC
      `;
      dlRows = await sql`
        SELECT id, key, status, multi_use, use_count, max_uses, notes,
               first_seen_at, last_seen_at, approved_at, last_download_at
        FROM download_keys
        WHERE status = 'approved'
        ORDER BY approved_at DESC
      `;
    } else if (status === "history") {
      baseRows = await sql`
        SELECT id, pickup_code, unit, office, status,
               submitted_at, ready_at, download_key
        FROM requests
        WHERE status = 'ready'
        ORDER BY ready_at DESC
      `;
      dlRows = await sql`
        SELECT id, key, status, multi_use, use_count, max_uses, notes,
               first_seen_at, last_seen_at, approved_at, last_download_at
        FROM download_keys
        WHERE status IN ('approved', 'used_up')
        ORDER BY approved_at DESC NULLS LAST, first_seen_at DESC
      `;
    } else {
      baseRows = await sql`
        SELECT id, pickup_code, unit, office, status,
               submitted_at, ready_at, download_key
        FROM requests
        ORDER BY submitted_at DESC
      `;
      dlRows = await sql`
        SELECT id, key, status, multi_use, use_count, max_uses, notes,
               first_seen_at, last_seen_at, approved_at, last_download_at
        FROM download_keys
        ORDER BY first_seen_at DESC
      `;
    }

    const activationRows = await fetchRequestsWithMachines(baseRows);
    const downloadRows = dlRows.map(mapDownloadRow);

    // Ενοποιημένη λίστα με sort by submittedAt desc
    const combined = [...activationRows, ...downloadRows].sort((a, b) => {
      const aDate = new Date(a.submittedAt || 0).getTime();
      const bDate = new Date(b.submittedAt || 0).getTime();
      return bDate - aDate;
    });

    const counts = await sql`
      SELECT
        (SELECT COUNT(*)::int FROM requests WHERE status = 'pending')
          + (SELECT COUNT(*)::int FROM download_keys WHERE status = 'pending') AS pending_count,
        (SELECT COUNT(*)::int FROM requests WHERE status = 'ready' AND hidden_from_completed_at IS NULL)
          + (SELECT COUNT(*)::int FROM download_keys WHERE status = 'approved') AS ready_count,
        (SELECT COUNT(*)::int FROM requests WHERE status = 'ready')
          + (SELECT COUNT(*)::int FROM download_keys WHERE status IN ('approved','used_up')) AS history_count
    `;

    return new Response(
      JSON.stringify({
        requests: combined,
        counts: {
          pending: Number(counts[0].pending_count),
          ready: Number(counts[0].ready_count),
          history: Number(counts[0].history_count),
        },
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
          "CDN-Cache-Control": "no-store",
          "Netlify-CDN-Cache-Control": "no-store",
        },
      }
    );
  } catch (err) {
    console.error("[SMAct] Admin list error:", err);
    return Response.json({ error: "Σφάλμα διακομιστή." }, { status: 500 });
  }
}
