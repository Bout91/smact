// GET /api/admin/feedback/list — admin only

import { neon } from "@neondatabase/serverless";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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

export async function GET(request) {
  if (!isAdmin(request)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
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
    return Response.json({ feedback, unreadCount, totalCount: feedback.length });
  } catch (err) {
    console.error("[SMAct] Feedback list error:", err);
    return Response.json({ error: "Σφάλμα διακομιστή." }, { status: 500 });
  }
}
