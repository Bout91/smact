// ─────────────────────────────────────────────────────────
// POST /api/request — Υποβολή νέας αίτησης
// Φάση 8: Δέχεται array από machine-ids (1-15)
// ─────────────────────────────────────────────────────────

import { neon } from "@neondatabase/serverless";

export const runtime = "nodejs";

const sql = neon(process.env.DATABASE_URL);
const ADMIN_URL = "https://smact.netlify.app/admin";
const RATE_LIMIT_MAX = 10;
const MAX_MACHINE_IDS = 15;

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
    return { ok: false, error: "Ο έλεγχος ασφαλείας απέτυχε. Ανανέωσε τη σελίδα και δοκίμασε ξανά." };
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
      WHERE ip = ${ip} AND hit_at > NOW() - INTERVAL '1 minute'
    `;
    if (rows[0].cnt >= RATE_LIMIT_MAX) {
      return { ok: false, error: "Πολλές αιτήσεις σε σύντομο χρονικό διάστημα. Δοκίμασε ξανά σε 1 λεπτό." };
    }
    await sql`INSERT INTO rate_limit_hits (ip) VALUES (${ip})`;
    return { ok: true };
  } catch (err) {
    console.error("[SMAct] Rate limit check error:", err);
    return { ok: true };
  }
}

async function sendAdminNotification({ pickupCode, unit, office, machineCount }) {
  const topic = process.env.NTFY_TOPIC;
  if (!topic) return;
  try {
    const lines = [
      `Pickup Code: ${pickupCode}`,
      `Machine-IDs: ${machineCount}`,
    ];
    if (unit) lines.push(`Μονάδα: ${unit}`);
    if (office) lines.push(`Γραφείο: ${office}`);
    const payload = {
      topic,
      title: machineCount > 1
        ? `🔔 SMAct: Νέα αίτηση (${machineCount} μηχανές)`
        : "🔔 SMAct: Νέα αίτηση",
      message: lines.join("\n"),
      priority: 2,
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

export async function POST(request) {
  try {
    const ip = getClientIp(request);

    // Rate limit
    const rate = await checkAndRecordRateLimit(ip);
    if (!rate.ok) return Response.json({ success: false, error: rate.error }, { status: 429 });

    const body = await request.json();

    // Captcha
    const captcha = await verifyTurnstile(body.turnstileToken, ip);
    if (!captcha.ok) return Response.json({ success: false, error: captcha.error }, { status: 400 });

    // machineIds: array of strings — δεχόμαστε είτε array είτε (για backward compat) single string
    let machineIds = [];
    if (Array.isArray(body.machineIds)) {
      machineIds = body.machineIds
        .map((x) => String(x || "").trim())
        .filter((x) => x.length > 0);
    } else if (body.machineId) {
      const single = String(body.machineId).trim();
      if (single) machineIds = [single];
    }

    // Dedupe (case-sensitive)
    machineIds = Array.from(new Set(machineIds));

    if (machineIds.length === 0) {
      return Response.json(
        { success: false, error: "Πρέπει να συμπληρώσεις τουλάχιστον 1 Machine-id." },
        { status: 400 }
      );
    }
    if (machineIds.length > MAX_MACHINE_IDS) {
      return Response.json(
        { success: false, error: `Μέγιστο ${MAX_MACHINE_IDS} Machine-ids ανά αίτηση.` },
        { status: 400 }
      );
    }

    const pickupCode = String(body.pickupCode || "").trim();
    if (!pickupCode) {
      return Response.json(
        { success: false, error: "Το pickupCode είναι υποχρεωτικό." },
        { status: 400 }
      );
    }

    const unit = String(body.unit || "").trim() || null;
    const office = String(body.office || "").trim() || null;

    // Duplicate pickup code
    const existing = await sql`
      SELECT id FROM requests WHERE pickup_code = ${pickupCode} LIMIT 1
    `;
    if (existing.length > 0) {
      return Response.json(
        { success: false, error: "Αυτό το Pickup Code χρησιμοποιείται ήδη. Διάλεξε άλλο (πάτα το 🎲 για τυχαίο)." },
        { status: 409 }
      );
    }

    // INSERT request (χωρίς machine_id — μπαίνουν στο request_machines)
    const reqRows = await sql`
      INSERT INTO requests (pickup_code, unit, office)
      VALUES (${pickupCode}, ${unit}, ${office})
      RETURNING id, submitted_at
    `;
    const requestId = reqRows[0].id;
    const submittedAt =
      reqRows[0].submitted_at instanceof Date
        ? reqRows[0].submitted_at.toISOString()
        : reqRows[0].submitted_at;

    // INSERT κάθε machine-id
    for (let i = 0; i < machineIds.length; i++) {
      await sql`
        INSERT INTO request_machines (request_id, machine_id, position)
        VALUES (${requestId}, ${machineIds[i]}, ${i})
      `;
    }

    console.log("[SMAct] New request saved:", {
      id: requestId,
      submittedAt,
      pickupCode,
      machineCount: machineIds.length,
      unit: unit || "(none)",
      office: office || "(none)",
    });

    await sendAdminNotification({
      pickupCode,
      unit,
      office,
      machineCount: machineIds.length,
    });

    return Response.json({ success: true, submittedAt });
  } catch (err) {
    console.error("[SMAct] Request handler error:", err);
    return Response.json(
      { success: false, error: "Σφάλμα διακομιστή. Δοκίμασε ξανά σε λίγο." },
      { status: 500 }
    );
  }
}
