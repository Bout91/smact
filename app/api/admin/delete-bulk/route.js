// ─────────────────────────────────────────────────────────
// POST /api/admin/delete-bulk — Admin cookie
// Body: { activationIds: [...], downloadKeys: [...] }
//   (και legacy: { ids: [...] } για activation ids μόνο, backward compat)
//
// Διαγράφει επιλεγμένες activation αιτήσεις + επιλεγμένα download keys.
// Χρησιμοποιείται για bulk delete στο tab Ιστορικού.
// ─────────────────────────────────────────────────────────

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

export async function POST(request) {
  if (!isAdmin(request)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();

    // Activation ids
    const activationRaw = Array.isArray(body.activationIds)
      ? body.activationIds
      : Array.isArray(body.ids)
        ? body.ids
        : [];
    const activationIds = activationRaw
      .map((x) => String(x || "").trim())
      .filter((x) => /^[0-9a-f-]{36}$/i.test(x));

    // Download keys (strings, not UUIDs — the key itself)
    const downloadKeysRaw = Array.isArray(body.downloadKeys) ? body.downloadKeys : [];
    const downloadKeys = downloadKeysRaw
      .map((x) => String(x || "").trim())
      .filter((x) => x.length >= 8 && x.length <= 200);

    if (activationIds.length === 0 && downloadKeys.length === 0) {
      return Response.json(
        { error: "Δεν δόθηκαν έγκυρες καταχωρήσεις για διαγραφή." },
        { status: 400 }
      );
    }

    if (activationIds.length > 500 || downloadKeys.length > 500) {
      return Response.json(
        { error: "Πάρα πολλά items σε ένα batch (max 500 ανά τύπο)." },
        { status: 400 }
      );
    }

    let deletedActivation = 0;
    let deletedDownloads = 0;

    if (activationIds.length > 0) {
      const rows = await sql`
        DELETE FROM requests
        WHERE id = ANY(${activationIds}::uuid[])
        RETURNING id
      `;
      deletedActivation = rows.length;
    }

    if (downloadKeys.length > 0) {
      const rows = await sql`
        DELETE FROM download_keys
        WHERE key = ANY(${downloadKeys}::text[])
        RETURNING id
      `;
      deletedDownloads = rows.length;
    }

    const total = deletedActivation + deletedDownloads;
    console.log(
      `[SMAct] Bulk delete: ${deletedActivation} activation + ${deletedDownloads} download = ${total} total`
    );

    return Response.json({
      ok: true,
      deleted: total,
      deletedActivation,
      deletedDownloads,
    });
  } catch (err) {
    console.error("[SMAct] Bulk delete error:", err);
    return Response.json({ error: "Σφάλμα διακομιστή." }, { status: 500 });
  }
}
