// GET /api/admin/settings/get — admin only, returns ALL site_settings
// Fix: ρητά cache headers ώστε ούτε browser ούτε Netlify CDN να κάνει cache.

import { neon } from "@neondatabase/serverless";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

const COOKIE_NAME = "smact_admin";
const sql = neon(process.env.DATABASE_URL);

function safeEqual(a, b) {
  if (typeof a !== "string" || typeof b !== "string") return false;
  if (a.length !== b.length) return false;
  let m = 0;
  for (let i = 0; i < a.length; i++) m |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return m === 0;
}

function isAdmin(request) {
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminPassword) return false;
  const cookieHeader = request.headers.get("cookie") || "";
  const match = cookieHeader.match(
    new RegExp(`(?:^|;\\s*)${COOKIE_NAME}=([^;]*)`)
  );
  if (!match) return false;
  return safeEqual(decodeURIComponent(match[1]), adminPassword);
}

const NO_CACHE_HEADERS = {
  "Content-Type": "application/json",
  "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
  "CDN-Cache-Control": "no-store",
  "Netlify-CDN-Cache-Control": "no-store",
};

export async function GET(request) {
  if (!isAdmin(request)) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: NO_CACHE_HEADERS,
    });
  }
  try {
    const rows = await sql`SELECT key, value FROM site_settings`;
    const settings = {};
    for (const r of rows) settings[r.key] = r.value || "";
    return new Response(JSON.stringify({ settings }), {
      status: 200,
      headers: NO_CACHE_HEADERS,
    });
  } catch (err) {
    console.error("[SMAct] Admin settings get error:", err);
    return new Response(JSON.stringify({ error: "Σφάλμα διακομιστή." }), {
      status: 500,
      headers: NO_CACHE_HEADERS,
    });
  }
}
