// ─────────────────────────────────────────────────────────
// GET /api/features — Public endpoint
// Επιστρέφει όλες τις περιγραφές των υποκαρτελών σε key/value map.
//
// Response: { features: { "office1::protocol": "<p>...</p>", ... }, updatedAt: {...} }
//
// Φάση 9 fix: force-dynamic + no-store headers ώστε να μη γίνεται
// cache από Next.js/Netlify/browser. Οι αλλαγές του admin πρέπει
// να φαίνονται αμέσως στους επισκέπτες.
// ─────────────────────────────────────────────────────────

import { neon } from "@neondatabase/serverless";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

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

    return new Response(JSON.stringify({ features, updatedAt }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
        "CDN-Cache-Control": "no-store",
        "Netlify-CDN-Cache-Control": "no-store",
      },
    });
  } catch (err) {
    console.error("[SMAct] Features list error:", err);
    return Response.json(
      { error: "Σφάλμα διακομιστή.", features: {}, updatedAt: {} },
      { status: 500 }
    );
  }
}
