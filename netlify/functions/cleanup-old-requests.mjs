// ─────────────────────────────────────────────────────────
// Netlify Scheduled Function — Καθημερινή διαγραφή αιτήσεων >30 ημερών
//
// Τρέχει αυτόματα στις 03:00 UTC κάθε μέρα.
// (05:00 Ελληνικής χειμερινής ώρας, 06:00 θερινής)
//
// Δεν εκτίθεται σαν HTTP endpoint — μόνο το Netlify το καλεί.
// Για manual trigger, χρησιμοποιείται το /api/admin/cleanup που είναι
// admin-protected.
// ─────────────────────────────────────────────────────────

import { neon } from "@neondatabase/serverless";

export default async () => {
  const startedAt = new Date().toISOString();
  console.log(`[SMAct Cleanup] Started at ${startedAt}`);

  try {
    const sql = neon(process.env.DATABASE_URL);

    // Διαγράφει όλες τις αιτήσεις με submitted_at > 30 μέρες πριν
    // (εφαρμόζεται και σε pending και σε ready)
    const deleted = await sql`
      DELETE FROM requests
      WHERE submitted_at < NOW() - INTERVAL '30 days'
      RETURNING id, pickup_code, status, submitted_at
    `;

    console.log(
      `[SMAct Cleanup] Deleted ${deleted.length} request(s) older than 30 days`
    );

    if (deleted.length > 0) {
      // Log για audit trail (φαίνεται στα Netlify function logs)
      for (const row of deleted) {
        console.log(
          `[SMAct Cleanup]  - id=${row.id} status=${row.status} ` +
            `submitted=${row.submitted_at}`
        );
      }
    }

    return new Response(
      JSON.stringify({
        ok: true,
        deleted: deleted.length,
        startedAt,
        finishedAt: new Date().toISOString(),
      }),
      {
        status: 200,
        headers: { "content-type": "application/json" },
      }
    );
  } catch (err) {
    console.error("[SMAct Cleanup] Error:", err);
    return new Response(
      JSON.stringify({ ok: false, error: err.message }),
      {
        status: 500,
        headers: { "content-type": "application/json" },
      }
    );
  }
};

// Cron: 03:00 UTC κάθε μέρα
// (Netlify χρησιμοποιεί standard cron expression: minute hour day-of-month month day-of-week)
export const config = {
  schedule: "0 3 * * *",
};
