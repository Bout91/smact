// ─────────────────────────────────────────────────────────
// POST /api/search — Αναζήτηση αίτησης με pickup code
//
// Φάση 4.3: Πραγματικό SELECT από τη Neon DB.
// Αφαιρέθηκαν τα magic test strings της Φάσης 3.3.
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

    // Αν κάποιος χρησιμοποίησε το ίδιο pickup code σε πολλές αιτήσεις
    // (πχ ξέχασε την προηγούμενη), επιστρέφουμε την ΠΙΟ ΠΡΟΣΦΑΤΗ.
    const rows = await sql`
      SELECT
        id,
        machine_id,
        pickup_code,
        status,
        activation_key,
        submitted_at,
        ready_at
      FROM requests
      WHERE pickup_code = ${pickupCode}
      ORDER BY submitted_at DESC
      LIMIT 1
    `;

    if (rows.length === 0) {
      return Response.json({ status: "not_found" });
    }

    const row = rows[0];
    const submittedAt =
      row.submitted_at instanceof Date
        ? row.submitted_at.toISOString()
        : row.submitted_at;
    const readyAt =
      row.ready_at instanceof Date
        ? row.ready_at.toISOString()
        : row.ready_at;

    if (row.status === "ready" && row.activation_key) {
      return Response.json({
        status: "ready",
        submittedAt,
        readyAt,
        machineId: row.machine_id,
        activationKey: row.activation_key,
      });
    }

    // Αλλιώς pending (status='pending' ή status='ready' χωρίς key για κάποιο λόγο)
    return Response.json({
      status: "pending",
      submittedAt,
    });
  } catch (err) {
    console.error("[SMAct] Search handler error:", err);
    return Response.json(
      { error: "Σφάλμα διακομιστή. Δοκίμασε ξανά σε λίγο." },
      { status: 500 }
    );
  }
}
