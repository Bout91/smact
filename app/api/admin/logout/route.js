// POST /api/admin/logout — Σβήνει το admin cookie

export const runtime = "nodejs";
const COOKIE_NAME = "smact_admin";

export async function POST() {
  const headers = new Headers({ "content-type": "application/json" });
  headers.append(
    "Set-Cookie",
    `${COOKIE_NAME}=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0`
  );
  return new Response(JSON.stringify({ ok: true }), { status: 200, headers });
}
