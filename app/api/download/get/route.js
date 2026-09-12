// ─────────────────────────────────────────────────────────
// GET /api/download/get?t=<signed_token>
//
// Φάση 12k: Verify HMAC token → server-side redirect στο Drive
// Ο χρήστης δε βλέπει ποτέ το πραγματικό Drive URL στο κουμπί λήψης.
//
// Ροή:
//   1. Verify HMAC signature (κανείς δε φτιάχνει fake token χωρίς secret)
//   2. Έλεγχος expiration (15 λεπτά ζωής)
//   3. Έλεγχος στη βάση ότι το κλειδί παραμένει approved/used_up
//   4. Extract Drive file ID από το admin_settings URL
//   5. 302 redirect στο direct-download URL του Drive
// ─────────────────────────────────────────────────────────

import { neon } from "@neondatabase/serverless";
import crypto from "crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const sql = neon(process.env.DATABASE_URL);

// Εξάγει το file ID από διάφορες μορφές Google Drive URL
function extractDriveFileId(url) {
  if (!url) return null;
  // https://drive.google.com/file/d/FILE_ID/view?usp=sharing
  const m1 = url.match(/\/d\/([a-zA-Z0-9_-]{20,})/);
  if (m1) return m1[1];
  // https://drive.google.com/open?id=FILE_ID  ή  ?id=FILE_ID
  const m2 = url.match(/[?&]id=([a-zA-Z0-9_-]{20,})/);
  if (m2) return m2[1];
  return null;
}

// Επαληθεύει HMAC token και επιστρέφει το payload αν είναι έγκυρο
function verifyToken(token, secret) {
  try {
    const parts = token.split(".");
    if (parts.length !== 2) return null;
    const [dataB64, sigB64] = parts;
    const expected = crypto
      .createHmac("sha256", secret)
      .update(dataB64)
      .digest("base64url");
    // Constant-time comparison
    const sigBuf = Buffer.from(sigB64, "base64url");
    const expBuf = Buffer.from(expected, "base64url");
    if (sigBuf.length !== expBuf.length) return null;
    if (!crypto.timingSafeEqual(sigBuf, expBuf)) return null;

    const payload = JSON.parse(
      Buffer.from(dataB64, "base64url").toString("utf8")
    );
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp < now) return null;
    return payload;
  } catch {
    return null;
  }
}

// Επιστρέφει φιλική HTML σελίδα σφάλματος (αντί για γυμνό JSON)
function errorPage(title, description, status = 401) {
  const html = `<!DOCTYPE html>
<html lang="el">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${title} — SMAct</title>
  <style>
    body { font-family: system-ui, -apple-system, "Segoe UI", sans-serif;
           background: linear-gradient(135deg,#0f172a 0%,#1e1b4b 50%,#0f172a 100%);
           color: #e2e8f0; padding: 40px 16px; margin: 0; min-height: 100vh; }
    .card { max-width: 480px; margin: 40px auto;
            background: rgba(30,41,59,0.6);
            border: 1px solid rgba(51,65,85,0.5);
            padding: 32px; border-radius: 12px; text-align: center;
            backdrop-filter: blur(8px); }
    h1 { color: #fbbf24; margin: 0 0 12px; font-size: 22px; }
    p { color: #cbd5e1; line-height: 1.6; margin: 0 0 24px; font-size: 14px; }
    a { color: white; text-decoration: none; padding: 12px 24px;
        background: linear-gradient(90deg,#0891b2,#0e7490);
        border-radius: 8px; display: inline-block; font-weight: 600; }
    a:hover { opacity: 0.9; }
  </style>
</head>
<body>
  <div class="card">
    <h1>⚠️ ${title}</h1>
    <p>${description}</p>
    <a href="/download">← Επιστροφή στο Download</a>
  </div>
</body>
</html>`;
  return new Response(html, {
    status,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

export async function GET(request) {
  const secret = process.env.DOWNLOAD_TOKEN_SECRET;
  if (!secret) {
    console.error("[SMAct] DOWNLOAD_TOKEN_SECRET is not set");
    return errorPage(
      "Σφάλμα ρύθμισης",
      "Το σύστημα δεν έχει ρυθμιστεί σωστά. Επικοινώνησε με τον Διαχειριστή.",
      500
    );
  }

  const { searchParams } = new URL(request.url);
  const token = searchParams.get("t");
  if (!token) {
    return errorPage(
      "Λείπει σύνδεσμος",
      "Ο σύνδεσμος λήψης δεν είναι έγκυρος. Επέστρεψε στη σελίδα Download και ξαναδοκίμασε.",
      400
    );
  }

  const payload = verifyToken(token, secret);
  if (!payload) {
    return errorPage(
      "Ο σύνδεσμος έληξε",
      "Ο προσωρινός σύνδεσμος λήψης έχει λήξει (ισχύει για 15 λεπτά). Επέστρεψε στη σελίδα Download και ξαναδοκίμασε με το ίδιο κλειδί."
    );
  }

  // Έλεγχος ότι το κλειδί παραμένει έγκυρο στη βάση
  try {
    const rows = await sql`
      SELECT status FROM download_keys WHERE id = ${payload.kid} LIMIT 1
    `;
    if (rows.length === 0) {
      return errorPage(
        "Κλειδί μη έγκυρο",
        "Το κλειδί σου δεν βρέθηκε. Επικοινώνησε με τον Διαχειριστή."
      );
    }
    const status = rows[0].status;
    if (status !== "approved" && status !== "used_up") {
      return errorPage(
        "Κλειδί μη ενεργό",
        "Το κλειδί σου δεν είναι πλέον ενεργό για download. Επικοινώνησε με τον Διαχειριστή."
      );
    }
  } catch (err) {
    console.error("[SMAct] DB error στο /get:", err);
    return errorPage("Σφάλμα διακομιστή", "Δοκίμασε ξανά σε λίγο.", 500);
  }

  // Πάρε το Drive URL από τη βάση
  const setting = await sql`
    SELECT value FROM site_settings WHERE key = 'download_drive_url' LIMIT 1
  `;
  const driveUrl = setting.length > 0 ? setting[0].value : "";
  if (!driveUrl) {
    return errorPage(
      "Δεν έχει οριστεί σύνδεσμος",
      "Ο Διαχειριστής δεν έχει ορίσει ακόμα το σύνδεσμο λήψης.",
      500
    );
  }

  // Μετατροπή σε direct-download URL
  const fileId = extractDriveFileId(driveUrl);
  const target = fileId
    ? `https://drive.google.com/uc?export=download&id=${fileId}`
    : driveUrl;

  // Server-side 302 redirect
  return new Response(null, {
    status: 302,
    headers: {
      Location: target,
      "Cache-Control": "no-store",
    },
  });
}
