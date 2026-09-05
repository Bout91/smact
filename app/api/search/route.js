// ─────────────────────────────────────────────────────────
// POST /api/search — Αναζήτηση αίτησης με pickup code
//
// Φάση 8: Επιστρέφει array από machines. Το κάθε machine έχει το
// δικό του activationKey/readyAt — μπορεί να είναι μερικώς έτοιμη.
//
// status:
//   • ready    → ΟΛΑ τα machines έχουν key (requests.status='ready')
//   • partial  → κάποια έχουν key αλλά όχι όλα
//   • pending  → κανένα δεν έχει key
//   • not_found → δεν υπάρχει pickup code
// ─────────────────────────────────────────────────────────

import { neon } from "@neondatabase/serverless";

export const runtime = "nodejs";

const sql = neon(process.env.DATABASE_URL);

export async function POST(request) {
  try {
    const body = await request.json();
    const pickupCode = String(body.pickupCode || "").trim();

    if (!pickupCode) {
      return Response.json(
        { error: "Το pickupCode είναι υποχρεωτικό." },
        { status: 400 }
      );
    }

    // Πάρε την πιο πρόσφατη αίτηση με αυτό το pickup code
    const reqRows = await sql`
      SELECT id, pickup_code, status, submitted_at, ready_at
      FROM requests
      WHERE pickup_code = ${pickupCode}
      ORDER BY submitted_at DESC
      LIMIT 1
    `;

    if (reqRows.length === 0) {
      return Response.json({ status: "not_found" });
    }

    const row = reqRows[0];
    const submittedAt =
      row.submitted_at instanceof Date
        ? row.submitted_at.toISOString()
        : row.submitted_at;
    const readyAt =
      row.ready_at instanceof Date ? row.ready_at.toISOString() : row.ready_at;

    // Πάρε όλα τα machines
    const machineRows = await sql`
      SELECT id, machine_id, activation_key, ready_at, position
      FROM request_machines
      WHERE request_id = ${row.id}
      ORDER BY position ASC
    `;

    const machines = machineRows.map((m) => ({
      id: m.id,
      machineId: m.machine_id,
      activationKey: m.activation_key,
      readyAt:
        m.ready_at instanceof Date ? m.ready_at.toISOString() : m.ready_at,
    }));

    const total = machines.length;
    const approved = machines.filter((m) => m.activationKey).length;

    let status;
    if (total === 0) {
      // Edge case: legacy request χωρίς machines (δεν πρέπει να συμβεί μετά τη migration)
      status = "pending";
    } else if (approved === total) {
      status = "ready";
    } else if (approved > 0) {
      status = "partial";
    } else {
      status = "pending";
    }

    return Response.json({
      status,
      submittedAt,
      readyAt,
      pickupCode: row.pickup_code,
      totalMachines: total,
      approvedMachines: approved,
      machines,
    });
  } catch (err) {
    console.error("[SMAct] Search handler error:", err);
    return Response.json(
      { error: "Σφάλμα διακομιστή. Δοκίμασε ξανά σε λίγο." },
      { status: 500 }
    );
  }
}
