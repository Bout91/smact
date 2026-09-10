// ─────────────────────────────────────────────────────────
// GET /api/settings/public — Public endpoint
// Επιστρέφει μόνο τα ασφαλή/δημόσια site_settings για το UI:
// contact_message, contact_details.
// ΔΕΝ επιστρέφει το drive URL (αυτό μόνο μέσω /api/download/check).
// ─────────────────────────────────────────────────────────

import { neon } from "@neondatabase/serverless";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const sql = neon(process.env.DATABASE_URL);

const PUBLIC_KEYS = ["download_contact_message", "download_contact_details"];

export async function GET() {
  try {
    const rows = await sql`
      SELECT key, value FROM site_settings
      WHERE key = ANY(${PUBLIC_KEYS}::text[])
    `;
    const settings = {};
    for (const r of rows) settings[r.key] = r.value || "";
    return new Response(JSON.stringify({ settings }), {
      status: 200,
      headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
    });
  } catch (err) {
    console.error("[SMAct] Public settings error:", err);
    return Response.json({ error: "Σφάλμα διακομιστή.", settings: {} }, { status: 500 });
  }
}
