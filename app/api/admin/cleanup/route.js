// ─────────────────────────────────────────────────────────
// POST /api/admin/cleanup
// Manual trigger του cleanup των αιτήσεων >30 ημερών.
// Ίδια λογική με το Netlify scheduled function, αλλά ενεργοποιείται
// on-demand από το admin panel (πχ για δοκιμή ή immediate cleanup).
// ─────────────────────────────────────────────────────────

import { neon } from "@neondatabase/serverless";

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

export async function POST(request) {
  if (!isAdmin(request)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const deleted = await sql`
      DELETE FROM requests
      WHERE submitted_at < NOW() - INTERVAL '30 days'
      RETURNING id
    `;

    console.log(
      `[SMAct] Manual cleanup: deleted ${deleted.length} request(s) >30 days old`
    );

    return Response.json({
      ok: true,
      deleted: deleted.length,
    });
  } catch (err) {
    console.error("[SMAct] Manual cleanup error:", err);
    return Response.json(
      { error: "Σφάλμα διακομιστή." },
      { status: 500 }
    );
  }
}
