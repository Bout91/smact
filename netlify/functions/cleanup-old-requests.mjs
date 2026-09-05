// ─────────────────────────────────────────────────────────
// Netlify Scheduled Function — Καθημερινό cleanup (03:00 UTC)
//
// Φάση 7 αλλαγή:
//   • Pending >30 μερών → DELETE
//   • Ready >30 μερών   → UPDATE hidden_from_completed_at
//                          (κρύβεται από Ολοκληρωμένες, μένει στο Ιστορικό)
//   • Rate limit hits >10 λεπτών → DELETE (housekeeping)
// ─────────────────────────────────────────────────────────

import { neon } from "@neondatabase/serverless";

export default async () => {
  const startedAt = new Date().toISOString();
  console.log(`[SMAct Cleanup] Started at ${startedAt}`);

  try {
    const sql = neon(process.env.DATABASE_URL);

    // 1) DELETE παλιές pending
    const deletedPending = await sql`
      DELETE FROM requests
      WHERE status = 'pending'
        AND submitted_at < NOW() - INTERVAL '30 days'
      RETURNING id
    `;

    // 2) HIDE παλιές ready από Ολοκληρωμένες
    const hiddenReady = await sql`
      UPDATE requests
      SET hidden_from_completed_at = NOW()
      WHERE status = 'ready'
        AND submitted_at < NOW() - INTERVAL '30 days'
        AND hidden_from_completed_at IS NULL
      RETURNING id
    `;

    // 3) Καθαρισμός παλιών rate limit hits
    const deletedHits = await sql`
      DELETE FROM rate_limit_hits
      WHERE hit_at < NOW() - INTERVAL '10 minutes'
      RETURNING ip
    `;

    console.log(
      `[SMAct Cleanup] deleted ${deletedPending.length} pending, ` +
        `hid ${hiddenReady.length} ready, ` +
        `cleaned ${deletedHits.length} rate-limit hits`
    );

    return new Response(
      JSON.stringify({
        ok: true,
        deletedPending: deletedPending.length,
        hiddenReady: hiddenReady.length,
        deletedRateLimitHits: deletedHits.length,
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

// Cron: 03:00 UTC κάθε μέρα (06:00 Ελληνική θερινή ώρα)
export const config = {
  schedule: "0 3 * * *",
};
