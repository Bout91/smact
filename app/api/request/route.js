// ─────────────────────────────────────────────────────────
// POST /api/request — Υποβολή νέας αίτησης κωδικού
//
// Φάση 4.4: Προστέθηκε έλεγχος για διπλό pickup code.
// Αν το pickup_code υπάρχει ήδη (pending ή ready), απορρίπτει.
// (Οι σβησμένες μετά 30 μέρες θα λείπουν από τη DB, οπότε OK.)
// ─────────────────────────────────────────────────────────

import { neon } from "@neondatabase/serverless";

export const runtime = "nodejs";

const sql = neon(process.env.DATABASE_URL);

export async function POST(request) {
  try {
    const body = await request.json();

    const machineId = String(body.machineId || "").trim();
    const pickupCode = String(body.pickupCode || "").trim();
    const unit = String(body.unit || "").trim() || null;
    const office = String(body.office || "").trim() || null;

    if (!machineId) {
      return Response.json(
        { success: false, error: "Το machineId είναι υποχρεωτικό." },
        { status: 400 }
      );
    }
    if (!pickupCode) {
      return Response.json(
        { success: false, error: "Το pickupCode είναι υποχρεωτικό." },
        { status: 400 }
      );
    }

    // Έλεγχος για διπλότυπο pickup code (case-sensitive)
    const existing = await sql`
      SELECT id FROM requests WHERE pickup_code = ${pickupCode} LIMIT 1
    `;
    if (existing.length > 0) {
      return Response.json(
        {
          success: false,
          error:
            "Αυτό το Pickup Code χρησιμοποιείται ήδη. Διάλεξε άλλο (πάτα το 🎲 για τυχαίο).",
        },
        { status: 409 }
      );
    }

    const rows = await sql`
      INSERT INTO requests (machine_id, pickup_code, unit, office)
      VALUES (${machineId}, ${pickupCode}, ${unit}, ${office})
      RETURNING id, submitted_at
    `;

    const inserted = rows[0];
    const submittedAt =
      inserted.submitted_at instanceof Date
        ? inserted.submitted_at.toISOString()
        : inserted.submitted_at;

    console.log("[SMAct] New request saved:", {
      id: inserted.id,
      submittedAt,
      pickupCode,
      unit: unit || "(none)",
      office: office || "(none)",
    });

    return Response.json({
      success: true,
      submittedAt,
    });
  } catch (err) {
    console.error("[SMAct] Request handler error:", err);
    return Response.json(
      {
        success: false,
        error: "Σφάλμα διακομιστή. Δοκίμασε ξανά σε λίγο.",
      },
      { status: 500 }
    );
  }
}
