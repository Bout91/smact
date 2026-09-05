// ─────────────────────────────────────────────────────────
// POST /api/request — Υποβολή νέας αίτησης κωδικού
//
// Φάση 7 additions:
//   • Cloudflare Turnstile verification (captcha)
//   • Rate limiting: max 10 αιτήσεις/λεπτό ανά IP
// ─────────────────────────────────────────────────────────

import { neon } from "@neondatabase/serverless";

export const runtime = "nodejs";

const sql = neon(process.env.DATABASE_URL);

const ADMIN_URL = "https://smact.netlify.app/admin";
const RATE_LIMIT_MAX = 10; // αιτήσεις/λεπτό
const RATE_LIMIT_WINDOW_SECONDS = 60;

// ─────────────────────────────────────────────────────────
// Turnstile verification
// ─────────────────────────────────────────────────────────
async function verifyTurnstile(token, ip) {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) {
    console.warn(
      "[SMAct] TURNSTILE_SECRET_KEY not set — παρακάμπτω verification"
    );
    return { ok: true };
  }
  if (!token) {
    return { ok: false, error: "Λείπει ο έλεγχος ασφαλείας (captcha)." };
  }

  try {
    const params = new URLSearchParams();
    params.append("secret", secret);
    params.append("response", token);
    if (ip) params.append("remoteip", ip);

    const response = await fetch(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      {
        method: "POST",
        body: params,
      }
    );

    const data = await response.json();

    if (data.success === true) {
      return { ok: true };
    }
    console.warn("[SMAct] Turnstile verification failed:", data);
    return {
      ok: false,
      error: "Ο έλεγχος ασφαλείας απέτυχε. Ανανέωσε τη σελίδα και δοκίμασε ξανά.",
    };
  } catch (err) {
    console.error("[SMAct] Turnstile verify error:", err);
    return {
      ok: false,
      error: "Αδυναμία επαλήθευσης ασφαλείας. Δοκίμασε ξανά σε λίγο.",
    };
  }
}

// ─────────────────────────────────────────────────────────
// Rate limiting — μέτρημα hits ανά IP στο τελευταίο λεπτό
// ─────────────────────────────────────────────────────────
function getClientIp(request) {
  // Netlify προσθέτει x-nf-client-connection-ip, standard είναι x-forwarded-for
  const nfIp = request.headers.get("x-nf-client-connection-ip");
  if (nfIp) return nfIp.trim();
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return "unknown";
}

async function checkAndRecordRateLimit(ip) {
  try {
    // Καθαρισμός παλαιών εγγραφών (ancient hits >10 λεπτών)
    // Το κάνουμε καιρικά όταν κάποιος υποβάλλει — cheap.
    await sql`
      DELETE FROM rate_limit_hits
      WHERE hit_at < NOW() - INTERVAL '10 minutes'
    `;

    // Μέτρα hits του IP στα τελευταία 60 δευτ.
    const rows = await sql`
      SELECT COUNT(*)::int AS cnt
      FROM rate_limit_hits
      WHERE ip = ${ip}
        AND hit_at > NOW() - INTERVAL '1 minute'
    `;
    const cnt = rows[0].cnt;

    if (cnt >= RATE_LIMIT_MAX) {
      return {
        ok: false,
        error:
          "Πολλές αιτήσεις σε σύντομο χρονικό διάστημα. Δοκίμασε ξανά σε 1 λεπτό.",
      };
    }

    // Καταγραφή του νέου hit
    await sql`INSERT INTO rate_limit_hits (ip) VALUES (${ip})`;

    return { ok: true };
  } catch (err) {
    console.error("[SMAct] Rate limit check error:", err);
    // Αν πέσει η DB για το rate limit, μη μπλοκάρουμε τους νόμιμους χρήστες
    return { ok: true };
  }
}

// ─────────────────────────────────────────────────────────
// Push notification στο κινητό (fire-and-forget)
// ─────────────────────────────────────────────────────────
async function sendAdminNotification({ pickupCode, unit, office }) {
  const topic = process.env.NTFY_TOPIC;
  if (!topic) return;

  try {
    const lines = [`Pickup Code: ${pickupCode}`];
    if (unit) lines.push(`Μονάδα: ${unit}`);
    if (office) lines.push(`Γραφείο: ${office}`);

    const payload = {
      topic,
      title: "🔔 SMAct: Νέα αίτηση",
      message: lines.join("\n"),
      priority: 2, // low
      tags: ["key"],
      click: ADMIN_URL,
    };

    await fetch("https://ntfy.sh/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  } catch (err) {
    console.warn("[SMAct] Push notification failed:", err.message);
  }
}

// ─────────────────────────────────────────────────────────
// Main POST handler
// ─────────────────────────────────────────────────────────
export async function POST(request) {
  try {
    const ip = getClientIp(request);

    // 1) Rate limiting
    const rateCheck = await checkAndRecordRateLimit(ip);
    if (!rateCheck.ok) {
      return Response.json(
        { success: false, error: rateCheck.error },
        { status: 429 }
      );
    }

    const body = await request.json();

    // 2) Turnstile verification
    const captcha = await verifyTurnstile(body.turnstileToken, ip);
    if (!captcha.ok) {
      return Response.json(
        { success: false, error: captcha.error },
        { status: 400 }
      );
    }

    // 3) Πεδία
    const machineId = String(body.machineId || "").trim();
    const pickupCode = String(body.pickupCode || "").trim();
    const unit = String(body.unit || "").trim() || null;
    const office = String(body.office || "").trim() || null;

    if (!machineId) {
      return Response.json(
        { success: false, error: "Το machineId είναι υποχρεωτικό." },
        { status: 400 }
      );
    }
    if (!pickupCode) {
      return Response.json(
        { success: false, error: "Το pickupCode είναι υποχρεωτικό." },
        { status: 400 }
      );
    }

    // 4) Duplicate pickup code check
    const existing = await sql`
      SELECT id FROM requests WHERE pickup_code = ${pickupCode} LIMIT 1
    `;
    if (existing.length > 0) {
      return Response.json(
        {
          success: false,
          error:
            "Αυτό το Pickup Code χρησιμοποιείται ήδη. Διάλεξε άλλο (πάτα το 🎲 για τυχαίο).",
        },
        { status: 409 }
      );
    }

    // 5) INSERT
    const rows = await sql`
      INSERT INTO requests (machine_id, pickup_code, unit, office)
      VALUES (${machineId}, ${pickupCode}, ${unit}, ${office})
      RETURNING id, submitted_at
    `;

    const inserted = rows[0];
    const submittedAt =
      inserted.submitted_at instanceof Date
        ? inserted.submitted_at.toISOString()
        : inserted.submitted_at;

    console.log("[SMAct] New request saved:", {
      id: inserted.id,
      submittedAt,
      pickupCode,
      unit: unit || "(none)",
      office: office || "(none)",
    });

    // 6) Push notification στον διαχειριστή
    await sendAdminNotification({ pickupCode, unit, office });

    return Response.json({
      success: true,
      submittedAt,
    });
  } catch (err) {
    console.error("[SMAct] Request handler error:", err);
    return Response.json(
      { success: false, error: "Σφάλμα διακομιστή. Δοκίμασε ξανά σε λίγο." },
      { status: 500 }
    );
  }
}
