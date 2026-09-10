// ─────────────────────────────────────────────────────────
// GET /api/admin/feedback/list — admin only
//
// Φάση 12e HOTFIX: Ρητά NO-STORE headers ώστε το Netlify CDN να μην
// επιστρέφει stale response — το πρόβλημα «σβήνω σχόλιο, πατάω
// ανανέωση, ξαναεμφανίζεται» οφειλόταν σε edge cache.
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

export async function GET(request) {
  if (!isAdmin(request)) {
    return jsonWithNoCache({ error: "Unauthorized" }, 401);
  }
  try {
    const rows = await sql`
      SELECT id, associated_key, message, created_at, read_at
      FROM download_feedback
      ORDER BY created_at DESC
      LIMIT 500
    `;
    const feedback = rows.map((r) => ({
      id: r.id,
      associatedKey: r.associated_key,
      message: r.message,
      createdAt: r.created_at instanceof Date ? r.created_at.toISOString() : r.created_at,
      readAt: r.read_at instanceof Date ? r.read_at.toISOString() : r.read_at,
    }));
    const unreadCount = feedback.filter((f) => !f.readAt).length;
    return jsonWithNoCache({ feedback, unreadCount, totalCount: feedback.length });
  } catch (err) {
    console.error("[SMAct] Feedback list error:", err);
    return jsonWithNoCache({ error: "Σφάλμα διακομιστή: " + err.message }, 500);
  }
}
