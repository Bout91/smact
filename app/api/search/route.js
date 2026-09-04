// ─────────────────────────────────────────────────────────
// POST /api/search — Αναζήτηση αίτησης με pickup code
//
// Φάση 3.3: MOCK responses (χωρίς DB).
//   • "test-ready"    → status: "ready"    (με fake activation key)
//   • "test-pending"  → status: "pending"
//   • οτιδήποτε άλλο  → status: "not_found"
//
// Στη Φάση 4 θα αντικατασταθεί με πραγματικό query στη Neon DB.
// Θυμήσου να ΑΦΑΙΡΕΣΕΙΣ τα magic test strings όταν συνδεθεί η DB!
// ─────────────────────────────────────────────────────────

export const runtime = "nodejs";

// Fake data — μόνο για Φάση 3.3
const FAKE_MACHINE_ID = "49408922-6ea1-488f-8293-6d37cdb97a2d";
const FAKE_ACTIVATION_KEY =
  "MEUCIQD5vN8xK2mJ4pQ9rT7wY6uHnB3cE1fA8sL0kZ2gWvR7hAIgYxT4pM6nQ9sE" +
  "3bK7mL2wP8rY5vN1uH4dCzA6xJ0iF9tK2mBcHeLpQwStRvUxYzAaBbCcDdEeFfGg";

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

    // MOCK — αφαίρεσε αυτό το block στη Φάση 4
    if (pickupCode === "test-ready") {
      const now = new Date();
      const submittedAt = new Date(
        now.getTime() - 2 * 60 * 60 * 1000
      ).toISOString(); // 2 ώρες πριν
      const readyAt = new Date(
        now.getTime() - 30 * 60 * 1000
      ).toISOString(); // 30 λεπτά πριν
      return Response.json({
        status: "ready",
        submittedAt,
        readyAt,
        machineId: FAKE_MACHINE_ID,
        activationKey: FAKE_ACTIVATION_KEY,
      });
    }

    if (pickupCode === "test-pending") {
      const submittedAt = new Date(
        Date.now() - 45 * 60 * 1000
      ).toISOString(); // 45 λεπτά πριν
      return Response.json({
        status: "pending",
        submittedAt,
      });
    }

    // Default για Φάση 3.3: πάντα "not_found"
    return Response.json({
      status: "not_found",
    });
  } catch (err) {
    console.error("[SMAct] Search handler error:", err);
    return Response.json(
      { error: "Σφάλμα διακομιστή. Δοκίμασε ξανά σε λίγο." },
      { status: 500 }
    );
  }
}
