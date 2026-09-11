// ─────────────────────────────────────────────────────────
// POST /api/download/check — Public endpoint (ΝΕΑ ΛΟΓΙΚΗ Φάσης 12b)
//
// Body: { downloadKey, turnstileToken }
//
// ΝΕΑ ΛΟΓΙΚΗ (anti-fraud):
//   • Αν το κλειδί ΔΕΝ υπάρχει στη DB (δεν έγινε pre-approved από admin)
//       → REJECT «Το κλειδί δεν είναι έγκυρο.» Τίποτα δεν αποθηκεύεται.
//   • Αν status='preauth' (admin το δημιούργησε)
//       → UPDATE σε 'pending' (user το εισήγαγε), notify admin, return "pending"
//   • Αν status='pending' (user το είχε ήδη εισάγει)
//       → UPDATE last_seen_at, return "pending"
//   • Αν status='approved' → return download URL (και update use_count)
//   • Αν status='used_up' → return "already used"
//   • Αν status='rejected' → return "not valid"
// ─────────────────────────────────────────────────────────

import { neon } from "@neondatabase/serverless";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const sql = neon(process.env.DATABASE_URL);
const RATE_LIMIT_MAX = 30;

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
    // Χρησιμοποιώ tagged ip για να μη μπερδεύεται feedback rate limit με check rate limit
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

    // Έλεγξε αν το κλειδί υπάρχει
    const existing = await sql`
      SELECT id, key, status, multi_use, use_count, max_uses
      FROM download_keys
      WHERE key = ${downloadKey}
      LIMIT 1
    `;

    if (existing.length === 0) {
      // ΝΕΑ ΛΟΓΙΚΗ: αν το κλειδί δεν υπάρχει στα pre-approved, απόρριψη — ΤΙΠΟΤΑ δεν αποθηκεύεται
      return Response.json({
        status: "rejected",
        message: "Το κλειδί δεν είναι έγκυρο. Επικοινώνησε με τον Διαχειριστή για να πάρεις κλειδί.",
      });
    }

    const row = existing[0];

    if (row.status === "preauth") {
      // Πρώτη εισαγωγή έγκυρου κλειδιού από user — μεταβαίνει σε pending, ειδοποίηση admin
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
      // Επανείσοδος - update last_seen_at
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
      // Πάρε το Drive URL από τα settings
      const setting = await sql`
        SELECT value FROM site_settings WHERE key = 'download_drive_url' LIMIT 1
      `;
      const downloadUrl = setting.length > 0 ? setting[0].value : "";
      if (!downloadUrl) {
        return Response.json(
          { error: "Ο Διαχειριστής δεν έχει ορίσει ακόμα το σύνδεσμο λήψης." },
          { status: 500 }
        );
      }

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

      return Response.json({
        status: "ok",
        downloadUrl,
        message: "Το κλειδί σου είναι έγκυρο! Πάτα το κουμπί λήψης παρακάτω.",
      });
    }

    return Response.json({ status: "unknown", message: "Άγνωστη κατάσταση." });
  } catch (err) {
    console.error("[SMAct] Download check error:", err);
    return Response.json({ error: "Σφάλμα διακομιστή." }, { status: 500 });
  }
}
