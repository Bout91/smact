// ─────────────────────────────────────────────────────────
// POST /api/request — Υποβολή νέας αίτησης κωδικού
//
// Φάση 3.2: Χωρίς πραγματική βάση δεδομένων ακόμα.
// Απλά επικυρώνει τα δεδομένα, τα καταγράφει στα Netlify function logs,
// και επιστρέφει επιτυχία.
//
// Στη Φάση 4 θα προστεθεί σύνδεση με Neon PostgreSQL για αποθήκευση.
// Στη Φάση 5 θα προστεθεί κλήση προς ntfy.sh για push στο κινητό.
// ─────────────────────────────────────────────────────────

export const runtime = "nodejs";

export async function POST(request) {
  try {
    const body = await request.json();

    const machineId = String(body.machineId || "").trim();
    const pickupCode = String(body.pickupCode || "").trim();
    const unit = String(body.unit || "").trim();
    const office = String(body.office || "").trim();

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

    const submittedAt = new Date().toISOString();

    // Log — αυτά θα φαίνονται στα Netlify function logs
    console.log("[SMAct] New activation request:", {
      submittedAt,
      machineId,
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
