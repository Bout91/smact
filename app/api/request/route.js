// ─────────────────────────────────────────────────────────
// POST /api/request — Υποβολή νέας αίτησης κωδικού
//
// Φάση 4.3: Πραγματικό INSERT στη Neon DB (αντικατάσταση mock).
// Στη Φάση 5 θα προστεθεί κλήση προς ntfy.sh για push στο κινητό.
// ─────────────────────────────────────────────────────────

import { neon } from "@neondatabase/serverless";

export const runtime = "nodejs";

// Ένα SQL client instance, reused σε κάθε request
const sql = neon(process.env.DATABASE_URL);

export async function POST(request) {
  try {
    const body = await request.json();

    const machineId = String(body.machineId || "").trim();
    const pickupCode = String(body.pickupCode || "").trim();
    // Άδεια προαιρετικά πεδία αποθηκεύονται ως NULL, όχι κενό string
    const unit = String(body.unit || "").trim() || null;
    const office = String(body.office || "").trim() || null;

    // Έλεγχος υποχρεωτικών πεδίων (μόνο "όχι κενό")
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

    // Εισαγωγή στη DB — το status είναι 'pending' από default,
    // το id (UUID) και submitted_at (NOW) παράγονται αυτόματα από την DB.
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
