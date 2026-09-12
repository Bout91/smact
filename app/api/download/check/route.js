// ─────────────────────────────────────────────────────────
// POST /api/download/check — Public endpoint
//
// Φάση 12k (κρυφά URLs):
//   • Αν status='approved', ΔΕΝ επιστρέφει πλέον απευθείας το Drive URL
//   • Αντ' αυτού, δημιουργεί έναν HMAC-signed token (15 λεπτά ζωής)
//   • Επιστρέφει URL της μορφής /api/download/get?t=<token>
//   • Ο user βλέπει smact URL, όχι Drive URL
//
// Απαιτείται νέα env variable: DOWNLOAD_TOKEN_SECRET
// ─────────────────────────────────────────────────────────

import { neon } from "@neondatabase/serverless";
import crypto from "crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const sql = neon(process.env.DATABASE_URL);
const RATE_LIMIT_MAX = 30;
const TOKEN_LIFETIME_SECONDS = 15 * 60; // 15 λεπτά

async function verifyTurnstile(token, ip) {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) return { ok: true };
  if (!token) return { ok: false, error: "Λείπει ο έλεγχος ασφαλείας (captcha)." };
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

async function checkAndRecordRateLimit(ip, tag) {
  try {
    await sql`DELETE FROM rate_limit_hits WHERE hit_at < NOW() - INTERVAL '10 minutes'`;
    const taggedIp = `${tag}:${ip}`;
    const rows = await sql`
      SELECT COUNT(*)::int AS cnt FROM rate_limit_hits
      WHERE ip = ${taggedIp} AND hit_at > NOW() - INTERVAL '1 minute'
    `;
    if (rows[0].cnt >= RATE_LIMIT_MAX) {
      return { ok: false, error: "Πολλές αιτήσεις σε σύντομο χρόνο. Δοκίμασε ξανά σε 1 λεπτό." };
    }
    await sql`INSERT INTO rate_limit_hits (ip) VALUES (${taggedIp})`;
    return { ok: true };
  } catch {
    return { ok: true };
  }
}

async function sendAdminNotification(downloadKey) {
  const topic = process.env.NTFY_TOPIC;
  if (!topic) return;
  try {
    await fetch("https://ntfy.sh/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        topic,
        title: "🔔 SMAct: Έγκυρο κλειδί Download περιμένει έγκριση",
        message: `Κλειδί: ${downloadKey.substring(0, 8)}…\nΈλεγξέ το στο SM Key Signer → Downloads.`,
        priority: 2,
        tags: ["arrow_down"],
      }),
    });
  } catch {}
}

// Φάση 12k: Δημιουργία HMAC-signed token για download
function createSignedToken(keyId, secret) {
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    kid: keyId,
    iat: now,
    exp: now + TOKEN_LIFETIME_SECONDS,
  };
  const dataB64 = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = crypto.createHmac("sha256", secret).update(dataB64).digest("base64url");
  return `${dataB64}.${sig}`;
}

export async function POST(request) {
  try {
    const ip = getClientIp(request);

    const rate = await checkAndRecordRateLimit(ip, "dlcheck");
    if (!rate.ok) return Response.json({ error: rate.error }, { status: 429 });

    const body = await request.json();
    const captcha = await verifyTurnstile(body.turnstileToken, ip);
    if (!captcha.ok) return Response.json({ error: captcha.error }, { status: 400 });

    const downloadKey = String(body.downloadKey || "").trim();
    if (!downloadKey || downloadKey.length < 8) {
      return Response.json(
        { error: "Το κλειδί πρέπει να είναι τουλάχιστον 8 χαρακτήρες." },
        { status: 400 }
      );
    }
    if (downloadKey.length > 100) {
      return Response.json({ error: "Το κλειδί είναι πολύ μεγάλο." }, { status: 400 });
    }

    const existing = await sql`
      SELECT id, key, status, multi_use, use_count, max_uses
      FROM download_keys
      WHERE key = ${downloadKey}
      LIMIT 1
    `;

    if (existing.length === 0) {
      return Response.json({
        status: "rejected",
        message: "Το κλειδί δεν είναι έγκυρο. Επικοινώνησε με τον Διαχειριστή για να πάρεις κλειδί.",
      });
    }

    const row = existing[0];

    if (row.status === "preauth") {
      await sql`
        UPDATE download_keys
        SET status = 'pending', last_seen_at = NOW()
        WHERE id = ${row.id}
      `;
      await sendAdminNotification(downloadKey);
      return Response.json({
        status: "pending",
        message: "Το κλειδί σου είναι έγκυρο! Δημιουργήθηκε αίτημα. Αναμένεται έγκριση από τον Διαχειριστή για download. Ξαναδοκίμασε αργότερα με το ίδιο κλειδί στο ίδιο πεδίο.",
      });
    }

    if (row.status === "pending") {
      await sql`UPDATE download_keys SET last_seen_at = NOW() WHERE id = ${row.id}`;
      return Response.json({
        status: "pending",
        message: "Το κλειδί σου είναι σε αναμονή τελικής έγκρισης από τον Διαχειριστή. Ξαναδοκίμασε αργότερα.",
      });
    }

    if (row.status === "rejected") {
      return Response.json({
        status: "rejected",
        message: "Αυτό το κλειδί δεν είναι έγκυρο. Επικοινώνησε με τον Διαχειριστή.",
      });
    }

    if (row.status === "used_up") {
      return Response.json({
        status: "used_up",
        message: "Αυτό το κλειδί έχει ήδη χρησιμοποιηθεί. Επικοινώνησε με τον Διαχειριστή για νέο.",
      });
    }

    if (row.status === "approved") {
      // Έλεγχος: υπάρχει το Drive URL στα settings;
      const setting = await sql`
        SELECT value FROM site_settings WHERE key = 'download_drive_url' LIMIT 1
      `;
      const driveUrl = setting.length > 0 ? setting[0].value : "";
      if (!driveUrl) {
        return Response.json(
          { error: "Ο Διαχειριστής δεν έχει ορίσει ακόμα το σύνδεσμο λήψης." },
          { status: 500 }
        );
      }

      // Έλεγχος: υπάρχει το secret για signing;
      const tokenSecret = process.env.DOWNLOAD_TOKEN_SECRET;
      if (!tokenSecret) {
        console.error("[SMAct] DOWNLOAD_TOKEN_SECRET is not set");
        return Response.json(
          { error: "Το σύστημα δεν έχει ρυθμιστεί σωστά (missing DOWNLOAD_TOKEN_SECRET). Επικοινώνησε με τον Διαχειριστή." },
          { status: 500 }
        );
      }

      // Update usage counter
      let newStatus = "approved";
      const newUseCount = row.use_count + 1;
      if (!row.multi_use) {
        newStatus = "used_up";
      } else if (row.max_uses && newUseCount >= row.max_uses) {
        newStatus = "used_up";
      }

      await sql`
        UPDATE download_keys
        SET use_count = ${newUseCount},
            last_download_at = NOW(),
            status = ${newStatus},
            last_seen_at = NOW()
        WHERE id = ${row.id}
      `;

      // Φάση 12k: Επιστροφή signed URL αντί για το raw Drive URL
      const token = createSignedToken(row.id, tokenSecret);
      const signedUrl = `/api/download/get?t=${token}`;

      return Response.json({
        status: "ok",
        downloadUrl: signedUrl,
        message: "Το κλειδί σου είναι έγκυρο! Πάτα το κουμπί λήψης παρακάτω.",
      });
    }

    return Response.json({ status: "unknown", message: "Άγνωστη κατάσταση." });
  } catch (err) {
    console.error("[SMAct] Download check error:", err);
    return Response.json({ error: "Σφάλμα διακομιστή." }, { status: 500 });
  }
}
