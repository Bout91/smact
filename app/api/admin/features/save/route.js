// ─────────────────────────────────────────────────────────
// POST /api/admin/features/save
// Body: { mainTabId: string, subTabId: string, descriptionHtml: string }
//
// UPSERT στον πίνακα program_features. Το HTML sanitized server-side.
// ─────────────────────────────────────────────────────────

import { neon } from "@neondatabase/serverless";
import { sanitizeHtml } from "../../../../lib/sanitize-html";

export const runtime = "nodejs";

const COOKIE_NAME = "smact_admin";
const sql = neon(process.env.DATABASE_URL);

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

const ID_RE = /^[a-zA-Z0-9_]{1,64}$/;

export async function POST(request) {
  if (!isAdmin(request)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const mainTabId = String(body.mainTabId || "").trim();
    const subTabId = String(body.subTabId || "").trim();
    const rawHtml = String(body.descriptionHtml || "");

    if (!ID_RE.test(mainTabId) || !ID_RE.test(subTabId)) {
      return Response.json(
        { error: "Λάθος mainTabId ή subTabId." },
        { status: 400 }
      );
    }

    const cleanHtml = sanitizeHtml(rawHtml);

    const rows = await sql`
      INSERT INTO program_features (main_tab_id, sub_tab_id, description_html, updated_at)
      VALUES (${mainTabId}, ${subTabId}, ${cleanHtml}, NOW())
      ON CONFLICT (main_tab_id, sub_tab_id)
      DO UPDATE SET
        description_html = EXCLUDED.description_html,
        updated_at = NOW()
      RETURNING id, updated_at
    `;

    const updatedAt =
      rows[0].updated_at instanceof Date
        ? rows[0].updated_at.toISOString()
        : rows[0].updated_at;

    console.log("[SMAct] Feature saved:", { mainTabId, subTabId, len: cleanHtml.length });

    return Response.json({ ok: true, updatedAt, sanitizedHtml: cleanHtml });
  } catch (err) {
    console.error("[SMAct] Feature save error:", err);
    return Response.json({ error: "Σφάλμα διακομιστή." }, { status: 500 });
  }
}
