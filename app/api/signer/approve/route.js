// ─────────────────────────────────────────────────────────
// POST /api/signer/approve
// Body: { requestId, machineRowId, activationKey }
//
// Endpoint για το SM Key Signer (.exe) — δέχεται Bearer token
// αντί για admin cookie. Ίδια λογική με το /api/admin/approve:
// σετάρει το activation_key για ΕΝΑ machine, και αν όλα τα
// machines της αίτησης έχουν πλέον key → σετάρει status='ready'.
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
  if (!token || token.length < 20) return false;
  const auth = request.headers.get("authorization") || "";
  const match = auth.match(/^Bearer\s+(.+)$/i);
  if (!match) return false;
  return safeEqual(match[1].trim(), token);
}

export async function POST(request) {
  if (!isAuthorized(request)) {
    return new Response(
      JSON.stringify({ error: "Unauthorized" }),
      { status: 401, headers: { "Content-Type": "application/json" } }
    );
  }

  try {
    const body = await request.json();
    const requestId = String(body.requestId || "").trim();
    const machineRowId = String(body.machineRowId || "").trim();
    const activationKey = String(body.activationKey || "").trim();

    if (!requestId || !/^[0-9a-f-]{36}$/i.test(requestId)) {
      return Response.json(
        { error: "Λάθος requestId." },
        { status: 400 }
      );
    }
    if (!machineRowId || !/^[0-9a-f-]{36}$/i.test(machineRowId)) {
      return Response.json(
        { error: "Λάθος machineRowId." },
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

    console.log("[SMAct] Signer approved:", {
      requestId,
      machineRowId,
      approved,
      total,
      requestReady,
    });

    return new Response(
      JSON.stringify({
        ok: true,
        readyAt,
        approvedMachines: approved,
        totalMachines: total,
        requestReady,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
      }
    );
  } catch (err) {
    console.error("[SMAct] Signer approve error:", err);
    return Response.json({ error: "Σφάλμα διακομιστή." }, { status: 500 });
  }
}
