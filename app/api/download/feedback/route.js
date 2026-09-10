// ─────────────────────────────────────────────────────────
// POST /api/download/feedback — Public endpoint
// Body: { message, associatedKey (optional), turnstileToken }
// ─────────────────────────────────────────────────────────

import { neon } from "@neondatabase/serverless";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const sql = neon(process.env.DATABASE_URL);
const RATE_LIMIT_MAX = 5;

async function verifyTurnstile(token, ip) {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) return { ok: true };
  if (!token) return { ok: false, error: "Λείπει ο έλεγχος ασφαλείας." };
  try {
    const params = new URLSearchParams();
    params.append("secret", secret);
    params.append("response", token);
    if (ip) params.append("remoteip", ip);
    const response = await fetch(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      { method: "POST", body: params }
    );
    const data = await response.json();
    if (data.success === true) return { ok: true };
    return { ok: false, error: "Ο έλεγχος ασφαλείας απέτυχε." };
  } catch {
    return { ok: false, error: "Αδυναμία επαλήθευσης ασφαλείας." };
  }
}

function getClientIp(request) {
  const nfIp = request.headers.get("x-nf-client-connection-ip");
  if (nfIp) return nfIp.trim();
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return "unknown";
}

async function checkAndRecordRateLimit(ip) {
  try {
    await sql`DELETE FROM rate_limit_hits WHERE hit_at < NOW() - INTERVAL '10 minutes'`;
    const rows = await sql`
      SELECT COUNT(*)::int AS cnt FROM rate_limit_hits
      WHERE ip = ${ip} AND hit_at > NOW() - INTERVAL '5 minutes'
    `;
    if (rows[0].cnt >= RATE_LIMIT_MAX) {
      return { ok: false, error: "Πολλά σχόλια σε σύντομο χρόνο. Δοκίμασε ξανά αργότερα." };
    }
    await sql`INSERT INTO rate_limit_hits (ip) VALUES (${ip})`;
    return { ok: true };
  } catch {
    return { ok: true };
  }
}

export async function POST(request) {
  try {
    const ip = getClientIp(request);

    const rate = await checkAndRecordRateLimit(ip);
    if (!rate.ok) return Response.json({ error: rate.error }, { status: 429 });

    const body = await request.json();
    const captcha = await verifyTurnstile(body.turnstileToken, ip);
    if (!captcha.ok) return Response.json({ error: captcha.error }, { status: 400 });

    const message = String(body.message || "").trim();
    const associatedKey = String(body.associatedKey || "").trim() || null;

    if (!message) {
      return Response.json({ error: "Πρέπει να γράψεις κάποιο σχόλιο." }, { status: 400 });
    }
    if (message.length > 5000) {
      return Response.json({ error: "Το σχόλιο είναι πολύ μεγάλο (max 5000 χαρακτήρες)." }, { status: 400 });
    }
    if (associatedKey && associatedKey.length > 100) {
      return Response.json({ error: "Το κλειδί είναι πολύ μεγάλο." }, { status: 400 });
    }

    await sql`
      INSERT INTO download_feedback (associated_key, message, ip)
      VALUES (${associatedKey}, ${message}, ${ip})
    `;

    console.log("[SMAct] Feedback received:", { keyPrefix: associatedKey?.substring(0, 6), len: message.length });

    return Response.json({ ok: true });
  } catch (err) {
    console.error("[SMAct] Feedback error:", err);
    return Response.json({ error: "Σφάλμα διακομιστή." }, { status: 500 });
  }
}
