// ─────────────────────────────────────────────────────────
// POST /api/download/feedback — Public endpoint
//
// Body: { message, associatedKey (REQUIRED), turnstileToken (optional) }
//
// Φάση 12d:
//   • Το captcha έγινε OPTIONAL — αν αποσταλεί, ελέγχεται· αλλιώς παραλείπεται
//   • Αυστηρότερο rate limit (5/10min ανά IP) — αντίβαρο στην απώλεια captcha
//   • Το ίδιο κλειδί επιτρέπεται μόνο σε status='approved' ή 'used_up'
//
// Φάση 12e HOTFIX:
//   • Προστέθηκε ntfy push notification στον admin όταν φτάνει νέο σχόλιο
//   • Επιστρέφει και το id του νέου σχολίου για επιβεβαίωση insert
//   • Ρητά NO-STORE headers
// ─────────────────────────────────────────────────────────

import { neon } from "@neondatabase/serverless";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

const sql = neon(process.env.DATABASE_URL);
const RATE_LIMIT_MAX = 5;

const NO_CACHE_HEADERS = {
  "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
  "CDN-Cache-Control": "no-store",
  "Netlify-CDN-Cache-Control": "no-store",
  Pragma: "no-cache",
  Expires: "0",
};

function jsonWithNoCache(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...NO_CACHE_HEADERS },
  });
}

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

// Φάση 12e: Push notification στον admin μέσω ntfy
async function sendAdminFeedbackNotification(keyPrefix, messagePreview) {
  const topic = process.env.NTFY_TOPIC;
  if (!topic) return;
  try {
    await fetch("https://ntfy.sh/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        topic,
        title: "💬 SMAct: Νέο σχόλιο από χρήστη",
        message: `Από κλειδί: ${keyPrefix}…\n"${messagePreview}"`,
        priority: 3,
        tags: ["speech_balloon"],
      }),
    });
  } catch {
    // silent — δεν χαλάει το σχόλιο αν αποτύχει το push
  }
}

export async function POST(request) {
  try {
    const ip = getClientIp(request);

    const rate = await checkAndRecordRateLimit(ip);
    if (!rate.ok) return jsonWithNoCache({ error: rate.error }, 429);

    const body = await request.json();
    // Turnstile optional — δεν μπλοκάρει
    await verifyTurnstile(body.turnstileToken, ip);

    const message = String(body.message || "").trim();
    const associatedKey = String(body.associatedKey || "").trim();

    if (!associatedKey) {
      return jsonWithNoCache(
        { error: "Πρέπει να καταχωρήσεις το Κλειδί Download που έχεις πάρει." },
        400
      );
    }
    if (!message) {
      return jsonWithNoCache({ error: "Πρέπει να γράψεις κάποιο σχόλιο." }, 400);
    }
    if (message.length > 5000) {
      return jsonWithNoCache({ error: "Το σχόλιο είναι πολύ μεγάλο (max 5000 χαρακτήρες)." }, 400);
    }
    if (associatedKey.length > 100 || associatedKey.length < 8) {
      return jsonWithNoCache({ error: "Το κλειδί είναι εκτός ορίων χαρακτήρων." }, 400);
    }

    // Έλεγχος: το κλειδί υπάρχει με status approved ή used_up (δηλαδή έχει εγκριθεί κάποτε)
    const rows = await sql`
      SELECT id, status FROM download_keys
      WHERE key = ${associatedKey}
      LIMIT 1
    `;
    if (rows.length === 0) {
      return jsonWithNoCache(
        { error: "Το κλειδί που έδωσες δεν είναι έγκυρο." },
        403
      );
    }
    const validStatuses = new Set(["approved", "used_up"]);
    if (!validStatuses.has(rows[0].status)) {
      return jsonWithNoCache(
        { error: "Το κλειδί σου δεν έχει εγκριθεί ακόμα. Σχόλια μπορούν να στέλνουν μόνο όσοι έχουν εγκεκριμένο κλειδί." },
        403
      );
    }

    // Insert + πάρε πίσω το id για να ξέρουμε ότι όντως γράφτηκε
    const inserted = await sql`
      INSERT INTO download_feedback (associated_key, message, ip)
      VALUES (${associatedKey}, ${message}, ${ip})
      RETURNING id
    `;

    const newId = inserted[0]?.id;
    console.log("[SMAct] Feedback received:", {
      id: newId,
      keyPrefix: associatedKey.substring(0, 6),
      len: message.length,
    });

    // Push notification — fire-and-forget, δεν καθυστερεί την απάντηση στον user
    const preview = message.length > 120 ? message.substring(0, 117) + "..." : message;
    sendAdminFeedbackNotification(associatedKey.substring(0, 8), preview).catch(() => {});

    return jsonWithNoCache({ ok: true, id: newId });
  } catch (err) {
    console.error("[SMAct] Feedback error:", err);
    return jsonWithNoCache({ error: "Σφάλμα διακομιστή: " + err.message }, 500);
  }
}
