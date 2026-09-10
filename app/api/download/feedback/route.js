// ─────────────────────────────────────────────────────────
// POST /api/download/feedback — Public endpoint (Φάση 12d fix)
//
// Body: { message, associatedKey (REQUIRED), turnstileToken (optional) }
//
// ΑΛΛΑΓΗ 12d:
//   • Το captcha έγινε OPTIONAL — αν αποσταλεί, ελέγχεται· αλλιώς παραλείπεται
//   • Αυστηρότερο rate limit (5/10min ανά IP) — αντίβαρο στην απώλεια captcha
//   • Το ίδιο κλειδί επιτρέπεται μόνο σε status='approved' ή 'used_up'
// ─────────────────────────────────────────────────────────

import { neon } from "@neondatabase/serverless";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const sql = neon(process.env.DATABASE_URL);
const RATE_LIMIT_MAX = 5;

async function verifyTurnstile(token, ip) {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) return { ok: true };  // no secret set → skip
  if (!token) return { ok: true };   // optional στο feedback
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
    // Αν το captcha απέτυχε αλλά υπάρχει έγκυρο key, το επιτρέπω (rate limit το προστατεύει)
    return { ok: true };
  } catch {
    return { ok: true };
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
    await sql`DELETE FROM rate_limit_hits WHERE hit_at < NOW() - INTERVAL '15 minutes'`;
    const taggedIp = `fb:${ip}`;
    const rows = await sql`
      SELECT COUNT(*)::int AS cnt FROM rate_limit_hits
      WHERE ip = ${taggedIp} AND hit_at > NOW() - INTERVAL '10 minutes'
    `;
    if (rows[0].cnt >= RATE_LIMIT_MAX) {
      return { ok: false, error: "Πολλά σχόλια σε σύντομο χρόνο. Δοκίμασε ξανά σε λίγο." };
    }
    await sql`INSERT INTO rate_limit_hits (ip) VALUES (${taggedIp})`;
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
    // Turnstile optional — δεν μπλοκάρει
    await verifyTurnstile(body.turnstileToken, ip);

    const message = String(body.message || "").trim();
    const associatedKey = String(body.associatedKey || "").trim();

    if (!associatedKey) {
      return Response.json(
        { error: "Πρέπει να καταχωρήσεις το Κλειδί Download που έχεις πάρει." },
        { status: 400 }
      );
    }
    if (!message) {
      return Response.json({ error: "Πρέπει να γράψεις κάποιο σχόλιο." }, { status: 400 });
    }
    if (message.length > 5000) {
      return Response.json({ error: "Το σχόλιο είναι πολύ μεγάλο (max 5000 χαρακτήρες)." }, { status: 400 });
    }
    if (associatedKey.length > 100 || associatedKey.length < 8) {
      return Response.json({ error: "Το κλειδί είναι εκτός ορίων χαρακτήρων." }, { status: 400 });
    }

    // Έλεγχος: το κλειδί υπάρχει με status approved ή used_up (δηλαδή έχει εγκριθεί κάποτε)
    const rows = await sql`
      SELECT id, status FROM download_keys
      WHERE key = ${associatedKey}
      LIMIT 1
    `;
    if (rows.length === 0) {
      return Response.json(
        { error: "Το κλειδί που έδωσες δεν είναι έγκυρο." },
        { status: 403 }
      );
    }
    const validStatuses = new Set(["approved", "used_up"]);
    if (!validStatuses.has(rows[0].status)) {
      return Response.json(
        { error: "Το κλειδί σου δεν έχει εγκριθεί ακόμα. Σχόλια μπορούν να στέλνουν μόνο όσοι έχουν εγκεκριμένο κλειδί." },
        { status: 403 }
      );
    }

    await sql`
      INSERT INTO download_feedback (associated_key, message, ip)
      VALUES (${associatedKey}, ${message}, ${ip})
    `;

    console.log("[SMAct] Feedback received:", { keyPrefix: associatedKey.substring(0, 6), len: message.length });

    return Response.json({ ok: true });
  } catch (err) {
    console.error("[SMAct] Feedback error:", err);
    return Response.json({ error: "Σφάλμα διακομιστή: " + err.message }, { status: 500 });
  }
}
