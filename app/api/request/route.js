// ─────────────────────────────────────────────────────────
// POST /api/request — Υποβολή νέας αίτησης κωδικού
//
// Φάση 5: Μετά από επιτυχή αποθήκευση στη DB, στέλνει push
// notification στο κινητό του διαχειριστή μέσω ntfy.sh.
// ─────────────────────────────────────────────────────────

import { neon } from "@neondatabase/serverless";

export const runtime = "nodejs";

const sql = neon(process.env.DATABASE_URL);

const ADMIN_URL = "https://smact.netlify.app/admin";

// ─────────────────────────────────────────────────────────
// Push notification στο κινητό του διαχειριστή
// Fire-and-forget: αν πέσει το ntfy, δεν σπάει η υποβολή.
// ─────────────────────────────────────────────────────────
async function sendAdminNotification({ pickupCode, unit, office }) {
  const topic = process.env.NTFY_TOPIC;
  if (!topic) {
    console.warn("[SMAct] NTFY_TOPIC δεν έχει οριστεί — παραλείπω push");
    return;
  }

  try {
    // Κτίζουμε το μήνυμα με τα διαθέσιμα στοιχεία
    const lines = [`Pickup Code: ${pickupCode}`];
    if (unit) lines.push(`Μονάδα: ${unit}`);
    if (office) lines.push(`Γραφείο: ${office}`);

    // Χρησιμοποιούμε JSON body — υποστηρίζει UTF-8 για Ελληνικά/emoji
    // χωρίς ανάγκη για header encoding.
    const payload = {
      topic: topic,
      title: "🔔 SMAct: Νέα αίτηση",
      message: lines.join("\n"),
      priority: 2, // low: arrives silently, χωρίς ήχο/vibration
      tags: ["key"],
      click: ADMIN_URL, // tap-to-open → πάει στο admin panel
    };

    const response = await fetch("https://ntfy.sh/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (response.ok) {
      console.log("[SMAct] Push notification στάλθηκε");
    } else {
      console.warn(
        `[SMAct] ntfy response status: ${response.status} ${response.statusText}`
      );
    }
  } catch (err) {
    console.warn("[SMAct] Απέτυχε η αποστολή push:", err.message);
    // Δεν πετάμε — η αίτηση έχει ήδη αποθηκευτεί επιτυχώς
  }
}

export async function POST(request) {
  try {
    const body = await request.json();

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

    // Έλεγχος για διπλότυπο pickup code
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

    // Push notification στον διαχειριστή (fire-and-forget)
    // Το await κρατάει τη function ζωντανή μέχρι να στείλει το push
    // — μικρή καθυστέρηση (~200-500ms) στην απόκριση, αλλά αποφεύγει
    // να τερματίσει η serverless function πριν φύγει το request.
    await sendAdminNotification({ pickupCode, unit, office });

    return Response.json({
      success: true,
      submittedAt,
    });
  } catch (err) {
    console.error("[SMAct] Request handler error:", err);
    return Response.json(
      {
        success: false,
        error: "Σφάλμα διακομιστή. Δοκίμασε ξανά σε λίγο.",
      },
      { status: 500 }
    );
  }
}
