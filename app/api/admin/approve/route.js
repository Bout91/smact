// ─────────────────────────────────────────────────────────
// POST /api/admin/approve
// Body: { requestId: uuid, machineRowId: uuid, activationKey: string }
//
// Φάση 8: Εγκρίνει ΕΝΑ machine-id (row στο request_machines).
// Αν μετά την έγκριση ΟΛΑ τα machines της αίτησης έχουν key,
// σετάρει το requests.status='ready' και ready_at=NOW().
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
    const requestId = String(body.requestId || "").trim();
    const machineRowId = String(body.machineRowId || "").trim();
    const activationKey = String(body.activationKey || "").trim();

    if (!requestId || !/^[0-9a-f-]{36}$/i.test(requestId)) {
      return Response.json(
        { error: "Λείπει ή είναι λάθος το requestId." },
        { status: 400 }
      );
    }
    if (!machineRowId || !/^[0-9a-f-]{36}$/i.test(machineRowId)) {
      return Response.json(
        { error: "Λείπει ή είναι λάθος το machineRowId." },
        { status: 400 }
      );
    }
    if (!activationKey) {
      return Response.json(
        { error: "Το activation key είναι υποχρεωτικό." },
        { status: 400 }
      );
    }

    // Update το συγκεκριμένο machine row
    const machineRows = await sql`
      UPDATE request_machines
      SET activation_key = ${activationKey},
          ready_at = NOW()
      WHERE id = ${machineRowId} AND request_id = ${requestId}
      RETURNING id, ready_at
    `;

    if (machineRows.length === 0) {
      return Response.json(
        { error: "Δεν βρέθηκε το machine-id στην αίτηση." },
        { status: 404 }
      );
    }

    // Έλεγξε αν όλα τα machines της αίτησης έχουν πλέον key
    const stats = await sql`
      SELECT
        COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE activation_key IS NOT NULL)::int AS approved
      FROM request_machines
      WHERE request_id = ${requestId}
    `;

    const total = stats[0].total;
    const approved = stats[0].approved;
    let requestReady = false;

    if (total > 0 && approved === total) {
      // Όλα εγκεκριμένα → η αίτηση γίνεται ready
      await sql`
        UPDATE requests
        SET status = 'ready',
            ready_at = NOW()
        WHERE id = ${requestId}
      `;
      requestReady = true;
    }

    const readyAt =
      machineRows[0].ready_at instanceof Date
        ? machineRows[0].ready_at.toISOString()
        : machineRows[0].ready_at;

    console.log("[SMAct] Machine approved:", {
      requestId,
      machineRowId,
      approved,
      total,
      requestReady,
    });

    return Response.json({
      ok: true,
      readyAt,
      approvedMachines: approved,
      totalMachines: total,
      requestReady,
    });
  } catch (err) {
    console.error("[SMAct] Approve error:", err);
    return Response.json({ error: "Σφάλμα διακομιστή." }, { status: 500 });
  }
}
