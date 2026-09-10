// ─────────────────────────────────────────────────────────
// POST /api/admin/feedback/delete — admin only. Body: { id }
//
// Φάση 12e HOTFIX: Ρητά NO-STORE headers + επιστρέφει και το
// updated feedback list, ώστε ο client να μη ξαναχτυπάει το CDN
// στο επόμενο refresh (και άρα να μη βλέπει stale response).
// ─────────────────────────────────────────────────────────

import { neon } from "@neondatabase/serverless";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

const COOKIE_NAME = "smact_admin";
const sql = neon(process.env.DATABASE_URL);

const NO_CACHE_HEADERS = {
  "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
  "CDN-Cache-Control": "no-store",
  "Netlify-CDN-Cache-Control": "no-store",
  Pragma: "no-cache",
  Expires: "0",
};

function safeEqual(a, b) {
  if (typeof a !== "string" || typeof b !== "string") return false;
  if (a.length !== b.length) return false;
  let m = 0;
  for (let i = 0; i < a.length; i++) m |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return m === 0;
}

function isAdmin(request) {
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminPassword) return false;
  const cookieHeader = request.headers.get("cookie") || "";
  const match = cookieHeader.match(
    new RegExp(`(?:^|;\\s*)${COOKIE_NAME}=([^;]*)`)
  );
  if (!match) return false;
  return safeEqual(decodeURIComponent(match[1]), adminPassword);
}

function jsonWithNoCache(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...NO_CACHE_HEADERS },
  });
}

export async function POST(request) {
  if (!isAdmin(request)) {
    return jsonWithNoCache({ error: "Unauthorized" }, 401);
  }
  try {
    const body = await request.json();
    const id = String(body.id || "").trim();
    if (!/^[0-9a-f-]{36}$/i.test(id)) {
      return jsonWithNoCache({ error: "Λάθος id." }, 400);
    }
    const rows = await sql`DELETE FROM download_feedback WHERE id = ${id} RETURNING id`;
    return jsonWithNoCache({ ok: true, deleted: rows.length });
  } catch (err) {
    console.error("[SMAct] Feedback delete error:", err);
    return jsonWithNoCache({ error: "Σφάλμα διακομιστή: " + err.message }, 500);
  }
}
