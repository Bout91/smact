// ─────────────────────────────────────────────────────────
// GET /api/features — Public endpoint
// Επιστρέφει όλες τις περιγραφές των υποκαρτελών σε key/value map.
//
// Response: { features: { "office1::protocol": "<p>...</p>", ... }, updatedAt: {...} }
// ─────────────────────────────────────────────────────────

import { neon } from "@neondatabase/serverless";

export const runtime = "nodejs";

const sql = neon(process.env.DATABASE_URL);

export async function GET() {
  try {
    const rows = await sql`
      SELECT main_tab_id, sub_tab_id, description_html, updated_at
      FROM program_features
    `;

    const features = {};
    const updatedAt = {};
    for (const r of rows) {
      const key = `${r.main_tab_id}::${r.sub_tab_id}`;
      features[key] = r.description_html || "";
      updatedAt[key] =
        r.updated_at instanceof Date ? r.updated_at.toISOString() : r.updated_at;
    }

    return Response.json({ features, updatedAt });
  } catch (err) {
    console.error("[SMAct] Features list error:", err);
    return Response.json(
      { error: "Σφάλμα διακομιστή.", features: {}, updatedAt: {} },
      { status: 500 }
    );
  }
}
