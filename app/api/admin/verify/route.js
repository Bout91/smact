// ─────────────────────────────────────────────────────────
// POST /api/admin/verify — Έλεγχος admin password + set cookie
//
// Παίρνει password στο body. Αν ταιριάζει με ADMIN_PASSWORD env var,
// στέλνει HttpOnly cookie για 7 μέρες. Αλλιώς 401.
// ─────────────────────────────────────────────────────────

export const runtime = "nodejs";

const COOKIE_NAME = "smact_admin";
const COOKIE_MAX_AGE_SECONDS = 7 * 24 * 60 * 60; // 7 μέρες

// Constant-time comparison — αποτρέπει timing attacks
function safeEqual(a, b) {
  if (typeof a !== "string" || typeof b !== "string") return false;
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}

export async function POST(request) {
  try {
    const adminPassword = process.env.ADMIN_PASSWORD;
    if (!adminPassword) {
      console.error("[SMAct] ADMIN_PASSWORD env var is not set");
      return Response.json(
        { ok: false, error: "Ο διακομιστής δεν είναι σωστά ρυθμισμένος." },
        { status: 500 }
      );
    }

    const body = await request.json();
    const password = String(body.password || "");

    if (!safeEqual(password, adminPassword)) {
      // Μικρή καθυστέρηση για να αποθαρρύνουμε brute-force
      await new Promise((r) => setTimeout(r, 500));
      return Response.json(
        { ok: false, error: "Λάθος password." },
        { status: 401 }
      );
    }

    const headers = new Headers({ "content-type": "application/json" });
    headers.append(
      "Set-Cookie",
      `${COOKIE_NAME}=${encodeURIComponent(adminPassword)}; ` +
        `HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=${COOKIE_MAX_AGE_SECONDS}`
    );

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers,
    });
  } catch (err) {
    console.error("[SMAct] Verify handler error:", err);
    return Response.json(
      { ok: false, error: "Σφάλμα διακομιστή." },
      { status: 500 }
    );
  }
}
