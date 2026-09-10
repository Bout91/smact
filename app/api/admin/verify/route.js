// ─────────────────────────────────────────────────────────
// POST /api/admin/verify — Έλεγχος admin password + set cookie
//
// Παίρνει password στο body. Αν ταιριάζει με ADMIN_PASSWORD env var,
// στέλνει HttpOnly cookie για 7 μέρες. Αλλιώς 401.
//
// Φάση 12d: Rate limiting για brute-force protection.
//   • 5 αποτυχημένες προσπάθειες/15 λεπτά/IP → block
//   • Επιτυχείς προσπάθειες δεν μετράνε
// ─────────────────────────────────────────────────────────

import { neon } from "@neondatabase/serverless";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const sql = neon(process.env.DATABASE_URL);
const COOKIE_NAME = "smact_admin";
const COOKIE_MAX_AGE_SECONDS = 7 * 24 * 60 * 60; // 7 μέρες

const LOGIN_MAX_ATTEMPTS = 5;
const LOGIN_WINDOW_MINUTES = 15;

// Constant-time comparison
function safeEqual(a, b) {
  if (typeof a !== "string" || typeof b !== "string") return false;
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}

function getClientIp(request) {
  const nfIp = request.headers.get("x-nf-client-connection-ip");
  if (nfIp) return nfIp.trim();
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return "unknown";
}

// Rate-limit only για αποτυχημένες προσπάθειες. Επιτυχείς → clear counter.
async function checkLoginRateLimit(ip) {
  try {
    await sql`DELETE FROM rate_limit_hits WHERE hit_at < NOW() - INTERVAL '30 minutes'`;
    const taggedIp = `login-fail:${ip}`;
    const rows = await sql`
      SELECT COUNT(*)::int AS cnt FROM rate_limit_hits
      WHERE ip = ${taggedIp}
        AND hit_at > NOW() - INTERVAL '15 minutes'
    `;
    if (rows[0].cnt >= LOGIN_MAX_ATTEMPTS) {
      return { ok: false, error: "Πάρα πολλές αποτυχημένες προσπάθειες. Δοκίμασε ξανά σε 15 λεπτά." };
    }
    return { ok: true };
  } catch {
    return { ok: true };
  }
}

async function recordFailedLogin(ip) {
  try {
    const taggedIp = `login-fail:${ip}`;
    await sql`INSERT INTO rate_limit_hits (ip) VALUES (${taggedIp})`;
  } catch {}
}

async function clearFailedLogins(ip) {
  try {
    const taggedIp = `login-fail:${ip}`;
    await sql`DELETE FROM rate_limit_hits WHERE ip = ${taggedIp}`;
  } catch {}
}

export async function POST(request) {
  try {
    const ip = getClientIp(request);

    // Έλεγχος rate limit πριν από validation
    const rate = await checkLoginRateLimit(ip);
    if (!rate.ok) {
      console.warn(`[SMAct] Login blocked (rate limit) from ${ip}`);
      return Response.json({ ok: false, error: rate.error }, { status: 429 });
    }

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
      // Κατέγραψε αποτυχία + delay για να αποθαρρύνουμε brute-force
      await recordFailedLogin(ip);
      await new Promise((r) => setTimeout(r, 800));
      console.warn(`[SMAct] Login failed from ${ip}`);
      return Response.json(
        { ok: false, error: "Λάθος password." },
        { status: 401 }
      );
    }

    // Επιτυχία → καθάρισε τα προηγούμενα failed attempts
    await clearFailedLogins(ip);
    console.log(`[SMAct] Login OK from ${ip}`);

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
